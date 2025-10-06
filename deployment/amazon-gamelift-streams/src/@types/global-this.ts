// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file provides a work-around for a globalThis issue encountered in Node.js. See: https://stackoverflow.com/questions/77427684/typescript-globalthis-for-browser-and-node-js-element-implicitly-has-an-any-t .
//
// The values in the _globalThis object come from:
//  * <pvagls-src>/config/.env
//  * makefile variables (which initially imports <pvagls-src>/config/.env)
//  * environment variables (set by either user or makefile locally, or deployment env on AWS (Lambda))
//
// If you import this file like `import _globalThis from './@types/global-this';`,
//  you'll be able to use _globalThis instead of globalThis, and set the variables in that file
//  based on any logic you want.
// 
// The downside of the work-around is that the <pvagls-src>/src/@types/index.d.ts file is somewhat duplicated if a backend is required;
//   ideally frontend/backend would share this. Luckily we do not have that problem - this is just a static website w/ no API.
// 
// FIXME Error: Dynamic require of "events" is not supported
import dotenv from 'dotenv'; 

if (!process.env.app_location || process.env.app_location === 'local') {
  // process.env will have the key/values defined in the `<pvagls-src>/config/.env` file,
  //  but won't override anything set already (e.g. we set env vars when deployed).
  dotenv.config({ path: `${process.cwd()}/./config/.env`, override: false });
}

//console.debug('process.env', JSON.stringify(process.env, null, 2));

let stage = process.env.stage || 'local';
const aws_account_id: string | undefined = process.env[`aws_${stage}_account_id`];
let aws_region: string | undefined = process.env[`aws_${stage}_region`];
const aws_cli_profile: string | undefined = process.env[`aws_${stage}_cli_profile`];

let aws_gls_stream_group_id: string | undefined = process.env[`aws_${stage}_gls_stream_group_id`];
let aws_gls_application_group_id: string | undefined = process.env[`aws_${stage}_gls_application_id`];

// Edge functions need to set these variables w/o env variables.
// Packaging step of edge functions during CICD overwrites the lines below to set the values.
let stage_added_by_build: string | undefined;
let aws_region_added_by_build: string | undefined;
let aws_gls_stream_group_id_added_by_build: string | undefined;
let aws_gls_application_group_id_added_by_build: string | undefined;

if (stage_added_by_build) { stage = stage_added_by_build; }
if (aws_region_added_by_build) { aws_region = aws_region_added_by_build; }
if (aws_gls_stream_group_id_added_by_build) { aws_gls_stream_group_id = aws_gls_stream_group_id_added_by_build; }
if (aws_gls_application_group_id_added_by_build) { aws_gls_application_group_id = aws_gls_application_group_id_added_by_build; }

const _globalThis = {
  app_location: process.env.app_location || 'local',
  app_url: process.env.app_url || 'http://localhost:8080',
  stage,
  aws_account_id,
  aws_region,
  aws_cli_profile,
  aws_gls_stream_group_id,
  aws_gls_application_group_id
}

export default _globalThis;