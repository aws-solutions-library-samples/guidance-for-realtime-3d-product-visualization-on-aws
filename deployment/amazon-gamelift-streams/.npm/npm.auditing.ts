// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// 
// This file is responsible for defining auditing specific dependencies. See: https://github.com/tsapporg/ts-npm/tree/aws-sample
const npmPackage: any = {
  dependencies: {},
  devDependencies: {
    'license-checker-rseidelsohn': '4.3.0', // Used to ensure NPM licenses in dependencies are OK to use. 
    'repolinter': 'github:todogroup/repolinter#main', // Need main branch. See: https://github.com/todogroup/repolinter/issues/299
    'license-report': '6.5.0', // Used to generate a license report.
    'source-licenser': '2.0.6', // Used to add license header to files.
  }
}

export default { npmPackage }