// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for listening to keyboard events and delegating business logic.
import * as comms from './comms';

document.addEventListener('keydown', (event: any) => {
  if (event.keyCode === 27) { // Escape key.
    comms.detachInputFromStream({});
  } 
});