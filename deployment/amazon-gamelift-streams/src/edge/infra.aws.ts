// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining our AWS Lambda@edge function.
// It serves as "middleware" b/t a website visitor's HTTP request for an "/api/*" resource to Amazon CloudFront - 
//  requests for 2 URIs /api/start-stream-session.json and /api/get-stream-session.json are dynamic,
//  where AWS API interactions decide the outcome of the response returned to the visitor. 
// This is used as an alternative to setting up an API to call AWS APIs because visitors to our
//  3D product visualizer do not need to be authenticated.
import _globalThis from '../@types/global-this';

import * as log from 'ts-app-logger';
log.configure({ traceEnabled: true, debugEnabled: true, infoEnabled: true, warningEnabled: true, errorEnabled: true, filters: [] });

import querystring from 'node:querystring';
import * as Lambda from 'aws-lambda';
import { GameLiftStreamsClient, StartStreamSessionCommand, StartStreamSessionCommandOutput, GetStreamSessionCommand, GetStreamSessionCommandOutput, CreateStreamSessionConnectionCommand, CreateStreamSessionConnectionCommandOutput } from '@aws-sdk/client-gameliftstreams';

import * as config from '../common/config';
import { findNearestAwsRegion } from './nearest-aws-region';

// TODO local client configuration
const gameLiftStreamsClient = new GameLiftStreamsClient({ region: _globalThis.aws_region });

export const onResourceRequest = async (event: Lambda.CloudFrontRequestEvent): Promise<Lambda.CloudFrontResponseResult | Lambda.CloudFrontRequestResult> => {
  log.debug('event', event);
  const request = event.Records[0].cf.request;
  log.debug('request', request);

  if (!['GET', 'POST'].includes(request.method)) { 
    log.warn('ignoring request, bad method');

    return request; 
  }

  if (!['/api/start-stream-session.json', '/api/get-stream-session.json', '/api/reconnect-stream-session.json'].includes(request.uri)) { 
    log.warn('ignoring request, bad uri');

    return request; 
  }
    
  if (request.method == 'POST' && request.uri === '/api/start-stream-session.json') {
    log.debug('requested to start stream');

    let signalRequest: string | undefined;
    try {
      // HTTP body is always passed as base64-encoded string. Decode it. Ensure valid JSON.
      signalRequest = JSON.parse(Buffer.from(request.body?.data!, 'base64').toString());
      signalRequest = JSON.stringify(signalRequest);
    } catch (error) {
      log.error('bad request, bad or no body');

      return {
        status: '400',
        statusDescription: 'Bad Request'
      }
    }

    if (!signalRequest) {
      log.error('bad request, signal request not parsed from body');

      return {
        status: '400',
        statusDescription: 'Bad Request'
      }
    }

    const params = querystring.parse(request.querystring) as { visitorId?: string; latitude?: number; longitude?: number; }
    if (!params.visitorId) {
      log.error('bad request, visitorId not present in querystring');

      return {
        status: '400',
        statusDescription: 'Bad Request'
      }
    }

    let nearestProvisionedRegion = _globalThis.aws_region!;
    
    if (params.latitude && params.longitude) {
      log.debug('have visitor location, can try route to closest streaming infra', params.latitude, params.longitude);

      try {
        const nearestAwsRegion = findNearestAwsRegion({ latitude: Number(params.latitude), longitude: Number(params.longitude) }, [
          _globalThis.aws_region! // TODO Currently we only support declaring one region in our config, will need to add a way to deploy streaming infra to multiple regions.
        ]);
        log.debug('nearestAwsRegion', nearestAwsRegion || 'n/a');

        if (nearestAwsRegion) { nearestProvisionedRegion = nearestAwsRegion.code; }
      } catch (error) {
        log.error('failed to find nearest aws region, will default to', nearestProvisionedRegion);
      }
    }

    const startStreamSessionResponse = await startStreamSession(signalRequest, params.visitorId, nearestProvisionedRegion);

    return {
      status: '200',
      statusDescription: 'OK',
      headers: {
        'cache-control': [{
          key: 'Cache-Control',
          value: 'max-age=0'
        }],
        'content-type': [{
          key: 'Content-Type',
          value: 'text/json'
        }]
      },
      body: JSON.stringify(startStreamSessionResponse)
    };
  }

  if (request.method === 'GET' && request.uri === '/api/get-stream-session.json') {
    log.debug('requested to get stream');

    const params = querystring.parse(request.querystring) as { streamSessionArn?: string; }
    if (!params.streamSessionArn) {
      log.error('bad request, streamSessionArn not present in querystring');

      return {
        status: '400',
        statusDescription: 'Bad Request'
      }
    }

    const getStreamSessionResponse = await getStreamSession(params.streamSessionArn);

    return {
      status: '200',
      statusDescription: 'OK',
      headers: {
        'cache-control': [{
          key: 'Cache-Control',
          value: 'max-age=0'
        }],
        'content-type': [{
          key: 'Content-Type',
          value: 'text/json'
        }]
      },
      body: JSON.stringify(getStreamSessionResponse)
    };
  }

  if (request.method == 'POST' && request.uri === '/api/reconnect-stream-session.json') {
    log.debug('requested to start stream');

    let signalRequest: string | undefined;
    try {
      // HTTP body is always passed as base64-encoded string. Decode it. Ensure valid JSON.
      signalRequest = JSON.parse(Buffer.from(request.body?.data!, 'base64').toString());
      signalRequest = JSON.stringify(signalRequest);
    } catch (error) {
      log.error('bad request, bad or no body');

      return {
        status: '400',
        statusDescription: 'Bad Request'
      }
    }

    if (!signalRequest) {
      log.error('bad request, signal request not parsed from body');

      return {
        status: '400',
        statusDescription: 'Bad Request'
      }
    }

    const params = querystring.parse(request.querystring) as { streamSessionArn?: string; }
    if (!params.streamSessionArn) {
      log.error('bad request, streamSessionArn not present in querystring');

      return {
        status: '400',
        statusDescription: 'Bad Request'
      }
    }

    const reconnectStreamSessionResponse = await reconnectStreamSession(signalRequest, params.streamSessionArn);

    return {
      status: '200',
      statusDescription: 'OK',
      headers: {
        'cache-control': [{
          key: 'Cache-Control',
          value: 'max-age=0'
        }],
        'content-type': [{
          key: 'Content-Type',
          value: 'text/json'
        }]
      },
      body: JSON.stringify(reconnectStreamSessionResponse)
    };
  }

  log.error('bad request, invalid uri');

  return {
    status: '400',
    statusDescription: 'Bad Request'
  }
};

const startStreamSession = async (signalRequest: string, visitorId: string, nearestProvisionedRegion: string): Promise<StartStreamSessionCommandOutput | undefined> => {
  log.debug('startStreamSession', signalRequest, visitorId);

  log.debug('_globalThis.aws_gls_stream_group_id', _globalThis.aws_gls_stream_group_id || 'n/a');
  log.debug('_globalThis.aws_gls_application_group_id', _globalThis.aws_gls_application_group_id || 'n/a');

  try {
    const startStreamSessionResponse = await gameLiftStreamsClient.send(new StartStreamSessionCommand({
      Identifier: _globalThis.aws_gls_stream_group_id,
      ApplicationIdentifier: _globalThis.aws_gls_application_group_id,
      Protocol: 'WebRTC',
      UserId: visitorId,
      SignalRequest: signalRequest,
      ConnectionTimeoutSeconds: config.streamSessionTimeoutInSeconds,
      Locations: [nearestProvisionedRegion]

      // If desired, you can pass Launch Arguments and Environment Variables to your executable here.
      // AdditionalLaunchArgs: [ "string" ],
      // "AdditionalEnvironmentVariables": {  "string" : "string" }
    }));

    return startStreamSessionResponse;
  } catch (error) {
    log.error('failed to start stream session', error);
  }

  return;
}

const getStreamSession = async (streamSessionArn: string): Promise<GetStreamSessionCommandOutput | undefined> => {
  log.debug('getStreamSession', streamSessionArn);

  try {
    const getStreamSessionResponse = await gameLiftStreamsClient.send(new GetStreamSessionCommand({
      Identifier: _globalThis.aws_gls_stream_group_id,
      StreamSessionIdentifier: streamSessionArn
    }));

    return getStreamSessionResponse;
  } catch (error) {
    log.error('failed to get stream session', error);
  }

  return;
}

const reconnectStreamSession = async (signalRequest: string, streamSessionArn: string): Promise<CreateStreamSessionConnectionCommandOutput | undefined> => {
  log.debug('reconnectStreamSession', signalRequest, streamSessionArn);

  try {
    const reconnectStreamSessionResponse = await gameLiftStreamsClient.send(new CreateStreamSessionConnectionCommand({ 
      Identifier: _globalThis.aws_gls_stream_group_id,
      SignalRequest: signalRequest,
      StreamSessionIdentifier: streamSessionArn
    }));

    return reconnectStreamSessionResponse;
  } catch (error) {
    log.error('failed to reconnect stream session', error);
  }

  return;
}