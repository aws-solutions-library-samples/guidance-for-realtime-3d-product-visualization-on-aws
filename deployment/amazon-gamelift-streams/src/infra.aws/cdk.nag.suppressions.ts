// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining cdk nag suppressions.
export const suppressWildcardInPolicy = {
  id: 'AwsSolutions-IAM5',
  reason: 'If we are using a wildcard it is because the policy requires it or we do not have a resource ID.'
}

export const suppressManagedPolicy = {
  id: 'AwsSolutions-IAM4',
  reason: 'Managed policies used are beneficial in that we do not have to manage.'
}

export const suppressNonLatestLambdaRuntime = {
  id: 'AwsSolutions-L1',
  reason: 'Current Lambda runtime version is intentionally maintained for stability and compatibility.'
}

export const suppressCodeBuildKMSUsage = {
  id: 'AwsSolutions-CB4',
  reason: 'We store output in a bucket with S3_MANAGED encryption. The artifacts bucket does nothing.'
}

export const suppressCloudFrontTLSVulnerabilitiesViewerConnection = {
  id: 'AwsSolutions-CFR4',
  reason: 'Default CloudFront viewer certificate is used.'
}

export const suppressCloudFrontTLSVulnerabilities = {
  id: 'AwsSolutions-CFR5',
  reason: 'CloudFront.SecurityPolicyProtocol.TLS_V1_2_2021 is configured and enforced but cdk nag is still complaining.'
}

