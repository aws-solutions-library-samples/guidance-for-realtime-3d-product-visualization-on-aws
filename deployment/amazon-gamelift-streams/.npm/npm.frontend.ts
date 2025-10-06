// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// 
// This file is responsible for defining frontend specific dependencies. See: https://github.com/tsapporg/ts-npm/tree/aws-sample
const npmPackage: any = {
  dependencies: {
    'normalize.css': '8.0.1', // Used for CSS resets.
    'ts-bus': '2.3.1', // Used for eventing.
    'localstorage-slim': '2.5.0', // Used to store visitor session state.
  },
  devDependencies: {
    // Used for mapping Node.js libs to frontend:
    'stream-browserify': '3.0.0',
    'crypto-browserify': '3.12.0',
    'os-browserify': '0.3.0',
    'path-browserify': '1.0.1',

    'ejs': '3.1.10', // Used to convert EJS templates to HTML.

    'dotenv-to-json': '0.1.0', // Used to convert our <pvagls-src>/config/.env file to JSON for injection in website HTML template.

    'clean-css-cli': '5.6.1', // Used to bundle styles.
    'esbuild': '0.19.2', // Used to bundle scripts and their dependencies.
    
    'local-web-server': '5.4.0' // Used to serve website locally for development.
  }
}

export default { npmPackage }