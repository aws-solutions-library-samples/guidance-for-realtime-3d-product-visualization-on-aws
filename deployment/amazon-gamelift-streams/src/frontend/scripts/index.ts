// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining the entrypoint to our business logic.
import * as log from 'ts-app-logger';
log.configure({ traceEnabled: true, debugEnabled: true, infoEnabled: true, warningEnabled: true, errorEnabled: true, filters: [] });

import * as comms from './comms';
import { Visitor, IPersistedVisitorProps, StreamState} from './visitor';
import { StreamSession } from './stream-session';
import { CaptchaCaptcha } from './captcha-captcha';
import { StatusDisplay, SimplifiedVisitorStatus, getErrorMessage } from './status-display';

// Import web components to initialize custom elements.
import './captcha-captcha';
import './status-display';

// Start listening for keyboard events we care about.
import './events.keyboard';

// FIXME Need to browserify some deps for dotenv used in local development.
//log.debug('aws_gls_application_group_id', _globalThis.aws_gls_application_group_id)
//log.debug('aws_local_gls_stream_group_id', _globalThis.aws_local_gls_stream_group_id)

const startProductVisualizerButton = document.getElementById('start-product-visualizer') as HTMLButtonElement;
const streamCaptcha = document.getElementById('stream-captcha') as CaptchaCaptcha;
const pvaglsAppContainer = document.getElementById('pvagls') as HTMLElement;
const streamStatusDisplay = document.getElementById('stream-status') as StatusDisplay;
if (!startProductVisualizerButton || !streamCaptcha || !pvaglsAppContainer || !streamStatusDisplay) { throw new Error('You fat-fingered an element ID!'); }

startProductVisualizerButton.onclick = (_event: MouseEvent) => {
  startProductVisualizerButton.disabled = true;
  // FIXME If we have an AWS WAF token + cookie from successful captcha test, how can we ensure still valid?
  // Right now we make a visitor pass the captcha test every time product visualizer is used to skip validity check,
  //  and that could be better.
  streamCaptcha.renderCaptcha();
}

comms.bus.subscribe(comms.invalidCaptchaEvent, async (event) => {
  log.warn('invalid captcha!');

  hideCaptchaAndShowAppContainer();

  streamStatusDisplay.update(SimplifiedVisitorStatus.ERROR, event.payload.errorMessage);
});

const hideCaptchaAndShowAppContainer = () => {
  startProductVisualizerButton.setAttribute('hidden', 'true');
  streamCaptcha.setAttribute('hidden', 'true');
  pvaglsAppContainer.removeAttribute('hidden');
}

comms.bus.subscribe(comms.validCaptchaEvent, async (event) => {
  log.debug('valid captcha!');

  hideCaptchaAndShowAppContainer();

  streamStatusDisplay.update(SimplifiedVisitorStatus.LOADING);

  const visitor = Visitor.fromLocalStorageOrElseInit(updateStreamStatusDisplayOnVisitorStateChange);
  visitor.wafToken = event.payload.wafToken; // Locally we don't have an AWS WAF token - value is undefined.
  visitor.save();
  log.debug('visitor', visitor);

  const stream = new StreamSession(visitor);

  window.onbeforeunload = (_event) => { stream.end(); }; // FIXME Does this affect visitor's ability to resume a stream session?
  
  try {
    await stream.initOrResume();
  } catch (error) {
    streamStatusDisplay.update(SimplifiedVisitorStatus.ERROR, getErrorMessage(error));
  };
});

// When changes are made to our visitor's state, propagate those to the UI.
const updateStreamStatusDisplayOnVisitorStateChange = (persistedVisitorProps: IPersistedVisitorProps) => {
  log.debug('updateStreamStatusDisplayOnVisitorStateChange', persistedVisitorProps);

  if (
    persistedVisitorProps.streamState === StreamState.STOPPED && 
    persistedVisitorProps.isStreamStarting
  ) {
    streamStatusDisplay.update(SimplifiedVisitorStatus.LOADING);
  }

  if (persistedVisitorProps.streamState === StreamState.RUNNING) {
    streamStatusDisplay.update(SimplifiedVisitorStatus.HIDE);
  }

  if (persistedVisitorProps.streamState === StreamState.ERROR) {
    streamStatusDisplay.update(SimplifiedVisitorStatus.ERROR, persistedVisitorProps.lastError);
  }
}