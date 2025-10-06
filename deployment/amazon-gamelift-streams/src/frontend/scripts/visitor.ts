// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for managing our website visitor's state.
// "visit" is just as good a name as a "visitor", TBH.
import ls from 'localstorage-slim';

export class Visitor {
  id: string;
  streamState: StreamState;
  isStreamStarting: boolean;
  locationCoordinates?: GeolocationCoordinates;
  streamSessionArn?: string;
  streamSessionLastConnectedDate?: Date;
  wafToken?: string;
  lastError?: string; // Not persisted b/t page reloads.
  pollingIntervalId?: NodeJS.Timeout; // Not persistable b/t page reloads.
  onSave?: OnSave; // Not persistable b/t page reloads.

  static fromLocalStorageOrElseInit(onSave?: OnSave): Visitor {
    const state = ls.get('visitor-state') as IVisitorState;
    if (state) { 
      const visitor = new Visitor(
        state.id, 
        state.streamState, 
        state.isStreamStarting,
        state.streamSessionArn,
        state.streamSessionLastConnectedDate,
        state.wafToken
      );
      visitor.onSave = onSave;

      return visitor;
    }

    const visitor = new Visitor(
      new Date().getTime().toString(),
      StreamState.STOPPED,
      false
    );
    visitor.onSave = onSave;

    return visitor;
  }

  constructor(
    id: string, 
    streamState: StreamState, 
    isStreamStarting: boolean,
    streamSessionArn?: string,
    streamSessionLastConnectedDate?: Date,
    wafToken?: string
  ) {
    this.id = id;
    this.streamState = streamState;
    this.isStreamStarting = isStreamStarting;
    this.streamSessionArn = streamSessionArn;
    this.streamSessionLastConnectedDate = streamSessionLastConnectedDate;
    this.wafToken = wafToken;
  }

  save() {
    this.persistToLocalStorage();

    if (!this.onSave) { return; }

    this.onSave({
      id: this.id,
      streamState: this.streamState,
      streamSessionArn: this.streamSessionArn,
      streamSessionLastConnectedDate: this.streamSessionLastConnectedDate,
      wafToken: this.wafToken,
      isStreamStarting: this.isStreamStarting,
      lastError: this.lastError
    });
  }

  private persistToLocalStorage() {
    ls.set('visitor-state', { 
      id: this.id,
      streamState: this.streamState,
      streamSessionArn: this.streamSessionArn,
      streamSessionLastConnectedDate: this.streamSessionLastConnectedDate,
      wafToken: this.wafToken,
      pollingIntervalId: this.pollingIntervalId,
      isStreamStarting: this.isStreamStarting,
    });
  }

  async tryFindLocation(): Promise<void> {
    return new Promise((resolve, _reject) => {
      if ('geolocation' in navigator) {
        return navigator.geolocation.getCurrentPosition((position) => {
          this.locationCoordinates = position.coords;
          this.persistToLocalStorage();

          return resolve();
        }, (_error: any) => {
          return resolve(); // Eat.
        }, { timeout: 3 * 1000 });
      }

      return resolve(); // Eat.
    });
  }

  initSlashReset() {
    ls.set('visitor-state', { 
      id: this.id,
      streamState: StreamState.STOPPED,
      streamSessionArn: undefined,
      streamSessionLastConnectedDate: undefined,
      pollingIntervalId: undefined,
      isStreamStarting: false
    });
  }
}

export interface IVisitorState {
  id: string;
  streamState: StreamState;
  streamSessionArn?: string;
  streamSessionLastConnectedDate?: Date;
  wafToken?: string;
  pollingIntervalId?: NodeJS.Timeout;
  isStreamStarting: boolean;
}

export enum StreamState {
  STOPPED,
  LOADING,
  RUNNING,
  ERROR
}

type OnSave = (visitorProps: IPersistedVisitorProps) => void;

export interface IPersistedVisitorProps {
  id: string;
  streamState: StreamState;
  isStreamStarting: boolean;
  streamSessionArn?: string;
  streamSessionLastConnectedDate?: Date;
  wafToken?: string;
  lastError?: string;
};