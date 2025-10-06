// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// 
// This file is responsible for defining development specific dependencies. See: https://github.com/tsapporg/ts-npm/tree/aws-sample
const npmPackage: any = {
  dependencies: {},
  devDependencies: {
    'shx': '0.3.4', // Used to invoke cross-platform build commands.
    'cross-env': '5.2.1', // Used to set cross-platform env variables.
    'concurrently': '7.5.0', // Used to invoke multiple watch commands concurrently.
    'onchange': '7.1.0', // Used to watch for source changes.
    'wait-on': '7.2.0', // Used to wait-on ports to run multiple Node.js processes at once (used with backend/frontend development).
    'rimraf': '5.0.5', // Used to cleanup files during local development and testing.
    'ts-command-line-args': '2.5.1', // Used to process CLI args.
  }
}

export default { npmPackage }