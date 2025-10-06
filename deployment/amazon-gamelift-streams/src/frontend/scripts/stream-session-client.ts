// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for making HTTP requests to dynamic Amazon CloudFront@edge URLs (AWS Lambda facilitates this).
// The URLs return JSON that is dynamic in nature - it will be the Amazon GameLift Streams API responses which happened at the edge.
// Rather than implement an API for rate limiting purposes, we just use AWS WAF to enable rate limiting (https://codezup.com/aws-waf-cloudfront-rate-limiting/) AND bot protection.
// Every non-bot visitor to this website can then interact with the 3D product visualizer - they just need to pass the captcha test.
// Visitors that pass the captcha test get an AWS WAF token, which gets passed to the the dynamic URLs, and AWS WAF protects them
//  to the degree we need them protected, i.e. non-bot visitors get to interact with the 3D product visualizer in an _authenticated_ manner.
// For more details about how the tokens work (kinda - docs are confusing), see: https://docs.aws.amazon.com/waf/latest/developerguide/waf-js-challenge-api-get-token.html
import * as log from 'ts-app-logger';

import { Visitor } from './visitor';

export const reconnect = async (visitor: Visitor, signalRequest: string) => {
  log.debug('reconnect');

  const url = `${getAppUrl()}api/reconnect-stream-session.json?` + new URLSearchParams({
    streamSessionArn: visitor.streamSessionArn!,
    wafToken: visitor.wafToken!
  });

  if (app_location === 'local') {
    const reconnectStreamSessionResponse = await fetch(url, { 
      method: 'post',
      body: signalRequest, 
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const reconnectStreamSessionResponseJson = await reconnectStreamSessionResponse.json();
    log.debug('reconnectStreamSessionResponseJson', reconnectStreamSessionResponseJson);

    const streamSession = reconnectStreamSessionResponseJson as IReconnectStreamSessionResponse;
    log.debug('streamSession', streamSession);

    return streamSession;
  }

  const reconnectStreamSessionResponse = await AwsWafIntegration.fetch(url, {
    method: 'post',
      body: signalRequest, 
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  log.debug('reconnectStreamSessionResponse', reconnectStreamSessionResponse);
  const reconnectStreamSessionResponseJson = await reconnectStreamSessionResponse.json();
  log.debug('reconnectStreamSessionResponseJson', reconnectStreamSessionResponseJson);

  const streamSession = reconnectStreamSessionResponseJson as IReconnectStreamSessionResponse;
  log.debug('streamSession', streamSession);

  return streamSession;
}

const getAppUrl = (): string => { return window.location.href; }

export const start = async (visitor: Visitor, signalRequest: string) => {
  log.debug('start');

  const url = `${getAppUrl()}api/start-stream-session.json?` + new URLSearchParams({
    visitorId: visitor.id,
    // Location may or may not exist and will be used to get the visitor a stream session using provisioned infra closest to them.
    latitude: `${visitor.locationCoordinates?.latitude}`,
    longitude: `${visitor.locationCoordinates?.longitude}`
  });

  if (app_location === 'local') {
    const startStreamSessionResponse = await fetch(url, { 
      method: 'post',
      body: signalRequest, 
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const startStreamSessionResponseJson = await startStreamSessionResponse.json();
    log.debug('startStreamSessionResponseJson', startStreamSessionResponseJson);

    const streamSession = startStreamSessionResponseJson as IStartStreamSessionResponse;
    log.debug('streamSession', streamSession);

    return streamSession;
  }

  const startStreamSessionResponse = await AwsWafIntegration.fetch(url, {
    method: 'post',
      body: signalRequest, 
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  log.debug('startStreamSessionResponse', startStreamSessionResponse);
  const startStreamSessionResponseJson = await startStreamSessionResponse.json();
  log.debug('startStreamSessionResponseJson', startStreamSessionResponseJson);

  const streamSession = startStreamSessionResponseJson as IStartStreamSessionResponse;
  log.debug('streamSession', streamSession);

  return streamSession;
}

export const get = async (visitor: Visitor) => {
  log.debug('get');

  const url = `${getAppUrl()}api/get-stream-session.json?` + new URLSearchParams({
    streamSessionArn: visitor.streamSessionArn!
  });

  if (app_location === 'local') {
    const getStreamSessionResponse = await fetch(url);
    const getStreamSessionResponseJson = await getStreamSessionResponse.json();
    log.debug('getStreamSessionResponseJson', getStreamSessionResponseJson);

    const streamSession = getStreamSessionResponseJson as IGetStreamSessionResponse;
    log.debug('streamSession', streamSession);

    return streamSession;
  }

  const getStreamSessionResponse = await AwsWafIntegration.fetch(url);
  log.debug('getStreamSessionResponse', getStreamSessionResponse);
  const getStreamSessionResponseJson = await getStreamSessionResponse.json();
  log.debug('getStreamSessionResponseJson', getStreamSessionResponseJson);

  const streamSession = getStreamSessionResponseJson as IGetStreamSessionResponse;
  log.debug('streamSession', streamSession);

  return streamSession;
}

interface IReconnectStreamSessionResponse {
  SignalResponse: string;
}

interface IStartStreamSessionResponse { // FIXME Correct?
  AdditionalEnvironmentVariables: Record<string, string>;
  AdditionalLaunchArgs: string[];
  ApplicationArn: string;
  Arn: string;
  ConnectionTimeoutSeconds: number;
  CreatedAt: number;
  Description: string;
  ExportFilesMetadata: { 
    OutputUri: string;
    streamState: string;
    streamStateReason: string;
  },
  LastUpdatedAt: number;
  Location: string;
  LogFileLocationUri: string;
  Protocol: string;
  SessionLengthSeconds: number;
  SignalRequest: string;
  SignalResponse: string;
  streamState: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  streamStateReason: string;
  StreamGroupId: string;
  UserId: string;
  WebSdkProtocolUrl: string;
}

interface IGetStreamSessionResponse {
  Arn: string;
  Description: string;
  StreamGroupId: string;
  UserId: string;
  Status: 'ACTIVATING' | 'ACTIVE' | 'CONNECTED' | 'PENDING_CLIENT_RECONNECTION' | 'RECONNECTING' | 'TERMINATING' | 'TERMINATED' | 'ERROR';
  StatusReason: 'internalError' | 'invalidSignalRequest' | 'placementTimeout' | 'applicationLogS3DestinationError';
  Protocol: 'WebRTC';
  Location: string;
  SignalRequest: string;
  SignalResponse: string;
  ConnectionTimeoutSeconds: number;
  SessionLengthSeconds: number;
  AdditionalLaunchArgs: string[];
  AdditionalEnvironmentVariables: Record<string, string>;
  LogFileLocationUri: string;
  WebSdkProtocolUrl: string;
  LastUpdatedAt: Date;
  CreatedAt: Date;
  ApplicationArn: string;
  ExportFilesMetadata: {
    Status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
    StatusReason: string;
    OutputUri: string;
  }
}