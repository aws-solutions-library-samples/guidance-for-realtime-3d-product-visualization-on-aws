// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for managing an Amazon GameLift Streams session of a 3D product visualizer for each visitor.
import * as log from 'ts-app-logger';

import * as comms from './comms';
// esbuild can not resolve this dependency.
// Instead, load the .js file in a <script> tag before we load our website scripts - 
//  this makes globalThis.gameliftstreams available to us.
//import * as gameliftstreams from './AmazonGameLiftStreamsWebSDK-v1.0.0/gameliftstreams-1.0.0.js';

import { StreamState, Visitor } from './visitor';
import { getErrorMessage } from './status-display';
import * as config from '../../common/config';
import * as streamSessionClient from './stream-session-client';

export class StreamSession {
  visitor: Visitor;
  gameLiftStreams?: globalThis.gameliftstreams.GameLiftStreams;

  constructor(visitor: Visitor) {
    this.visitor = visitor;
    this.resetGameLiftStreamsSDK();

    comms.bus.subscribe(comms.detachInputFromStreamEvent, async () => {
      this.gameLiftStreams?.detachInput();
    });
  }

  private resetGameLiftStreamsSDK() {
    this.gameLiftStreams = new  globalThis.gameliftstreams.GameLiftStreams({
      videoElement: this.getVideoElement(),
      audioElement: this.getAudioElement(),
      inputConfiguration: {
        setCursor: 'visibility',
        autoPointerLock: 'fullscreen'
      },
      clientConnection: {
        connectionState: (state: string) => {
          log.debug('connectionState callback', state);
        },
        channelError: (error: any) => {
          log.error('channelError callback', error);
          this.visitor.lastError = getErrorMessage(error);
          this.visitor.save();
        },
        serverDisconnect: (reasonCode: string) => {
          log.debug('serverDisconnect callback', reasonCode);

          this.visitor.streamState = StreamState.STOPPED;
          this.visitor.save();
        }
      }
    });
  }

  private getVideoElement(): HTMLVideoElement {
    return document.getElementById('pvagls-video') as HTMLVideoElement; 
  }

  private getAudioElement(): HTMLAudioElement {
    return document.getElementById('pvagls-audio') as HTMLAudioElement;
  }

  async initOrResume() { 
    try {
      if (this.visitor.streamSessionArn && !this.isStreamSessionTimeout()) { // Resume!
        log.warn('will try to resume previous stream session');

        await this.reconnectStreamSession();
      } else { // Init!
        this.visitor.initSlashReset();
        await this.visitor.tryFindLocation(); // Location is used to connect visitor to closer stream infra.

        await this.startStreamSession();
      }

      // Update visitor.streamSessionLastConnectedDate so if a visitor tries to reconnect after getting disconnected,
      //  we have a decent idea of when they were last connected.
      await setInterval(() => {
        if (
          this.visitor.streamState === StreamState.RUNNING && 
          !this.visitor.lastError 
        ) {
          log.debug('updating vistor.streamSessionLastConnectedDate to allow for reconnect');

          this.visitor.streamSessionLastConnectedDate = new Date();
          this.visitor.save();
        }
      }, 5 * 1000);
    } catch (error) {
      log.error('failed to create stream session', error);
      console.error(error);
      
      this.visitor.streamState = StreamState.ERROR;
      this.visitor.lastError = getErrorMessage(error);
      this.visitor.save();
    }
  }

  private isStreamSessionTimeout(): boolean {
    if (!this.visitor.streamSessionLastConnectedDate) { return true; }

    const now = new Date().getTime();
    const then = this.visitor.streamSessionLastConnectedDate.getTime();
    const timeInSecondsSinceSessionLastInUse = (now - then) / 1000;

    return timeInSecondsSinceSessionLastInUse < config.streamSessionTimeoutInSeconds - 5;
  }

  private async reconnectStreamSession() {
    log.debug('reconnectStreamSession');

    this.visitor.isStreamStarting = true;
    this.visitor.lastError = undefined;
    this.visitor.streamState = StreamState.LOADING;
    this.visitor.save();

    const signalRequest = await this.gameLiftStreams?.generateSignalRequest();
    log.debug('signalRequest', signalRequest);

    await streamSessionClient.reconnect(this.visitor, signalRequest!);

    this.visitor.pollingIntervalId = await setInterval(() => {
      this.pollUntilStreamSessionStarted();
    }, 5 * 1000);
    this.visitor.save();
  }

  private async pollUntilStreamSessionStarted() {
    log.debug('pollUntilStreamSessionStarted', this.visitor.streamSessionArn);

    if (!this.visitor.streamSessionArn) {
      log.warn('no streamSessionArn');
      
      this.visitor.lastError = 'Unable to start product visualizer. Please contact the IT administrator of this website.';
      
      return;
    }
    
    const streamSession = await streamSessionClient.get(this.visitor);

    if (streamSession.Status !== 'ACTIVE') { return; }

    log.debug('stopping polling');
    clearInterval(this.visitor.pollingIntervalId);
    this.visitor.pollingIntervalId = undefined;
    this.visitor.streamSessionLastConnectedDate = new Date();
    this.visitor.save();

    await this.gameLiftStreams?.processSignalResponse(streamSession.SignalResponse);
    
    // Enables mouse/keyboard/gamepad input event transmission and enables any automatic event listeners 
    //  that were specified in the input configuration passed to the Amazon GameLift Streams constructor.
    this.gameLiftStreams?.attachInput();

    this.visitor.streamState = StreamState.RUNNING;
    this.visitor.isStreamStarting = false;
    this.visitor.save();
  }

  private async startStreamSession() {
    log.debug('startStreamSession');
    
    this.visitor.isStreamStarting = true;
    this.visitor.streamState = StreamState.LOADING;
    this.visitor.save();

    const signalRequest = await this.gameLiftStreams?.generateSignalRequest();
    log.debug('signalRequest', signalRequest);

    const streamSession = await streamSessionClient.start(this.visitor, signalRequest!);

    this.visitor.streamSessionArn = streamSession.Arn;
    this.visitor.save();

    this.visitor.pollingIntervalId = await setInterval(() => {
      this.pollUntilStreamSessionStarted();
    }, 5 * 1000);
    this.visitor.save();
  }

  end() {
    log.debug('end');

    this.gameLiftStreams?.close();
    this.resetGameLiftStreamsSDK();
    this.visitor.initSlashReset();
  }
}