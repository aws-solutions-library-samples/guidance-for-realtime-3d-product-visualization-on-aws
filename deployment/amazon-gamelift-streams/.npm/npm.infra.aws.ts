// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// 
// This file is responsible for defining AWS infra specific dependencies. See: https://github.com/tsapporg/ts-npm/tree/aws-sample
const awsCdkVersion = '2.1019.2';

const npmPackage: any = {
  dependencies: {
    'aws-sdk': '2.1692.0', // Used for making requests to Amazon GameLift Streams.
    '@types/aws-lambda': '8.10.125' // Used to get AWS Lambda handler types.
  },
  devDependencies: {
    'aws-cdk-lib': '2.202.0',
    'aws-cdk': awsCdkVersion,
    'cdk-nag': '2.36.26',
    'constructs': '10.1.196',
    'source-map-support': '0.5.21'
  }
}

export default { npmPackage }