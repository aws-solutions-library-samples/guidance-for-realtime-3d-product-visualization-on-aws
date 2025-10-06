// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining our ECR repo abstraction.
import * as Constructs from 'constructs';
import * as ECR from 'aws-cdk-lib/aws-ecr';
import * as cdk from 'aws-cdk-lib';

export default class ContainerImageRepo extends Constructs.Construct {
  readonly repo: ECR.IRepository;

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);

    this.repo = new ECR.Repository(this, 'ecr-repo', { 
      repositoryName: props.repositoryName,
      imageScanOnPush: true,
      removalPolicy: props.removalPolicy,
      // FIXME The AWS CloudFormation stack won't delete properly if Amazon ECR repos aren't empty. See: https://github.com/aws/aws-cdk/issues/12618
      // We took care of this in the `<pvagls-src>/makefile.aws` file using the `destroy` command,
      //  but would rather not have to manually do it.
      //autoDeleteImages: trues
    });
  }
}

interface Props {
  readonly repositoryName?: string;
  readonly removalPolicy?: cdk.RemovalPolicy;
}