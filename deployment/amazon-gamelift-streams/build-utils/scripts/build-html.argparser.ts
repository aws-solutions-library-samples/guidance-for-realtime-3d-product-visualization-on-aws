// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for parsing command-line arguments passed to the respectively named CLI program.
import { parse } from 'ts-command-line-args';

class ArgParser {
  readonly args: CLIArgs;
  private readonly appStages = ['local', 'main'];
  private readonly appLocations = ['local', 'aws'];

  constructor() {
    this.args = parse<CLIArgs>(
      {
        // This seems like a lot of configuration! 
        // This allows for you to run the website locally but still rely on AWS resources in main, if need be.
        'stage': { type: String, description: 'local|main' },
        'app-location': { type: String, description: 'local|aws' },
        'aws-waf-api-key': { type: String, optional: true },
        'aws-waf-captcha-integration-url': { type: String, optional: true }
      }
    );

    if (!this.appStages.includes(this.args.stage)) {
      console.error('Invalid stage supplied as arg, must be one of: local|main');

      process.exit(1);
    }

    if (!this.appLocations.includes(this.args['app-location'])) {
      console.error('Invalid app-location supplied as arg, must be one of: local|aws');

      process.exit(1);
    }
  }
}

interface CLIArgs {
  // FIXME Argparser not compatible with types.
  readonly 'stage': string; //TAppStage;
  readonly 'app-location': string; // TAppLocation;
  readonly 'aws-waf-api-key'?: string;
  readonly 'aws-waf-captcha-integration-url'?: string;
}

const argparser = new ArgParser();

export { argparser }