// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for providing an event emitter interface.
import { EventBus, createEventDefinition } from 'ts-bus';

export const bus = new EventBus();

const eventPrefix = 'pvagls';
export const detachInputFromStreamEvent = createEventDefinition<{}>()(`${eventPrefix}.detachInputFromStream`);
export const invalidCaptchaEvent = createEventDefinition<{ errorMessage: string; }>()(`${eventPrefix}.invalidCaptcha`);
export const validCaptchaEvent = createEventDefinition<{ wafToken?: string; }>()(`${eventPrefix}.validCaptcha`);

export const detachInputFromStream = (params: {}) => {
  bus.publish(detachInputFromStreamEvent(params));
}

export const invalidCaptcha = (params: { errorMessage: string; }) => {
  bus.publish(invalidCaptchaEvent(params));
}

export const validCaptcha = (params: { wafToken?: string; }) => {
  bus.publish(validCaptchaEvent(params));
}
