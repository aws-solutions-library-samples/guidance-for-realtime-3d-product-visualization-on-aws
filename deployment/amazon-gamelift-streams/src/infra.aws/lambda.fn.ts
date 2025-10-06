// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining our Lambda function abstraction.
import * as Constructs from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as EC2 from 'aws-cdk-lib/aws-ec2';
import * as SQS from 'aws-cdk-lib/aws-sqs';
import * as LOGS from 'aws-cdk-lib/aws-logs';
import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as constants from './constants';
import * as policies from './policies';
import Env from './env';
//import { getRemovalPolicy } from './resource';

export default class TSLambdaFunction extends Constructs.Construct {
  readonly function: Lambda.Function | CloudFront.experimental.EdgeFunction;

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);

    if (props.functionType === 'docker') {
      if (!props.dockerContextPath || !props.dockerfilePath) { throw new Error('TSLambdaFunction missing props: dockerContextPath || dockerfilePath'); }

      console.debug('beginning cdk docker lambda build...');
      console.debug('dockerContextPath', props.dockerContextPath);
      console.debug('dockerfilePath', props.dockerfilePath);

      this.function = new Lambda.DockerImageFunction(this, 'docker-fn', {
        functionName: `${props.functionName || id}-fn`,
        code: Lambda.DockerImageCode.fromImageAsset(props.dockerContextPath, { 
          file: props.dockerfilePath,
          // FIXME Couldn't get "DOCKER" to work because it recursively copies cdk-out dir (even though its in the "dockerignore" file), 
          //  but the "GIT" approach seems to work with some tweaks to .gitignore during CICD (we need some files in .gitignore NOT ignored during Docker build).
          ignoreMode: cdk.IgnoreMode.GIT
        }),
        timeout: cdk.Duration.minutes(15), 
        memorySize: props.memorySize,
        ephemeralStorageSize: props.ephemeralStorageSize,
        environment: {
          ...props.environment,
          ...props.env.environment
        },
        vpc: props.vpc,
        layers: props.layers
      });
    } else if (props.functionType === 'edge') {
      if (!props.cmd || !props.code) { throw new Error('TSLambdaFunction missing props: cmd || code'); }

      console.debug('finding lambda@edge src...');
      console.debug('code', props.code);
      console.debug('handler', props.cmd);
      console.debug('setupCommands', props.setupCommands);

      this.function = new CloudFront.experimental.EdgeFunction(this, 'edge-fn', {
        functionName: `${props.functionName || id}-fn`,
        code: props.setupCommands ? Lambda.Code.fromAsset(props.code, {
          bundling: {
            command: props.setupCommands,
            image: Lambda.Runtime.NODEJS_20_X.bundlingImage,
            user: 'root'
          },
          exclude: props.exclude
        }) : Lambda.Code.fromAsset(props.code),
        handler: props.cmd,
        runtime: Lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.seconds(5), 
        memorySize: 128
      });
    } else {
      if (!props.cmd || !props.code) { throw new Error('TSLambdaFunction missing props: cmd || code'); }

      console.debug('finding lambda src...');
      console.debug('code', props.code);
      console.debug('handler', props.cmd);
      console.debug('setupCommands', props.setupCommands);

      this.function = new Lambda.Function(this, 'nodejs-fn', {
        functionName: `${props.functionName || id}-fn`,
        code: props.setupCommands ? Lambda.Code.fromAsset(props.code, {
          bundling: {
            command: props.setupCommands,
            image: Lambda.Runtime.NODEJS_20_X.bundlingImage,
            user: 'root'
          },
          exclude: props.exclude
        }) : Lambda.Code.fromAsset(props.code),
        handler: props.cmd,
        runtime: Lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.minutes(15), 
        memorySize: props.memorySize,
        ephemeralStorageSize: props.ephemeralStorageSize,
        environment: {
          ...props.environment,
          ...props.env.environment
        },
        vpc: props.vpc,
        layers: props.layers,
        deadLetterQueue: props.deadLetterQueue
      });
    }

    this.function.addToRolePolicy(policies.allowPutMetrics);
    this.function.addToRolePolicy(policies.allowPutLogs);

    //if (getRemovalPolicy(props.stage)) { this.function.applyRemovalPolicy(getRemovalPolicy(props.stage)!); }

    new LOGS.LogGroup(this, 'fn-log-group', {
      logGroupName: `/aws/lambda/${this.function.functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: LOGS.RetentionDays.ONE_WEEK
    });
  }
}

interface Props extends constants.CommonProps {
  readonly env: Env;

  readonly functionName?: string;
  readonly memorySize?: number;
  readonly ephemeralStorageSize?: cdk.Size;
  readonly environment?: { [key: string]: string; }
  readonly vpc?: EC2.IVpc;
  readonly layers?: Lambda.ILayerVersion[];
  readonly deadLetterQueue?: SQS.IQueue;

  readonly functionType?: 'standard' | 'edge' | 'docker';
  readonly dockerContextPath?: string;
  readonly dockerfilePath?: string;

  readonly code?: string;
  readonly exclude?: string[];
  readonly cmd?: string;
  readonly setupCommands?: string[];
}