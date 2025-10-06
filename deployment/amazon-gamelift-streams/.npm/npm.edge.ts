// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// 
// This file is responsible for defining AWS edge function specific dependencies. See: https://github.com/tsapporg/ts-npm/tree/aws-sample
const npmPackage: any = {
  dependencies: {},
  devDependencies: {
    '@aws-sdk/client-gameliftstreams': '3.835.0' // Used for making requests to Amazon GameLift Streams.
  }
}

export default { npmPackage }