// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining common env vars.
import * as Constructs from 'constructs';
import * as constants from './constants';

export default class Env extends Constructs.Construct {
  readonly environment: { [key: string]: string } = {};

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);
    
    this.environment = {
      ...props.environment,

      app_location: 'aws',
      stage: props.stage.name,
      node_env: 'development',

      aws_resource_prefix: props.stage.getResourcePrefix(),
      aws_resource_suffix: props.stage.deployId,
      aws_cfn_prefix: props.stage.getConfig().cfnPrefix,
      aws_deploy_id: props.stage.getConfig().deployID,
      aws_account_id: props.stage.getConfig().accountID,
  
      NODE_OPTIONS: '--enable-source-maps'
    };
  }
}

interface Props extends constants.CommonProps {
  readonly environment?: { [key: string]: string; }
}