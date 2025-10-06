// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for declaring frontend global types. 
// See ./global-this.ts for more details on why there are 2 global type files.
declare global {
  var AwsWafCaptcha: AwsWafCaptcha | undefined; // From window js include when deployed to AWS.
  var AwsWafIntegration: AwsWafIntegration | undefined; // From window js include when deployed to AWS.

  var app_stage: string;
  var app_location: string;
  var aws_waf_api_key: string | undefined;
}

// TODO need to go through here for global/module scope: https://stackoverflow.com/questions/38906359/create-a-global-variable-in-typescript
export {};