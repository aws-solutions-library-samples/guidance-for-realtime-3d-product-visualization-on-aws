// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
import AppStage from './stage';
import * as IAM from 'aws-cdk-lib/aws-iam';

// This file is responsible for defining common infra policies.
export const allowCDK = (stage: AppStage): IAM.PolicyStatement => {
  return new IAM.PolicyStatement({
    actions: [
      'sts:AssumeRole', 
      'iam:PassRole'
    ],
    resources: [
      //'arn:aws:iam::*:role/cdk-readOnlyRole',
      `arn:aws:iam::*:role/cdk-${stage.getConfig().cdkQualifier}-deploy-role-*`,
      `arn:aws:iam::*:role/cdk-${stage.getConfig().cdkQualifier}-file-publishing-*`,
      `arn:aws:iam::*:role/cdk-${stage.getConfig().cdkQualifier}-image-publishing-*`,
      `arn:aws:iam::*:role/cdk-${stage.getConfig().cdkQualifier}-lookup-*`
    ]
  });
}

export const allowPutMetrics = new IAM.PolicyStatement({
  effect: IAM.Effect.ALLOW,
  resources: ['*'],
  actions: ['cloudwatch:PutMetricData']
});

export const allowPutLogs = new IAM.PolicyStatement({
  effect: IAM.Effect.ALLOW,
  resources: ['*'],
  actions: ['logs:PutLogEventsBatch', 'logs:PutLogEvents', 'logs:CreateLogStream']
});

export const allowBucketReadAccess = (bucketArn: string): IAM.PolicyStatement => {
  return new IAM.PolicyStatement({
    actions: ['s3:Get*', 's3:List*'],
    resources: [bucketArn, `${bucketArn}/*`]
  });
}

export const allowBucketReadWriteAccess = (bucketArn: string): IAM.PolicyStatement =>  {
  return new IAM.PolicyStatement({
    actions: ['s3:Get*', 's3:Put*', 's3:DeleteObject', 's3:List*'],
    resources: [bucketArn, `${bucketArn}/*`]
  });
}