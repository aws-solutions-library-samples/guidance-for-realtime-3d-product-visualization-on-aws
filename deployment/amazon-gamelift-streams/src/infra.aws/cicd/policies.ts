// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining IAM policies used in deployment of ThreeDProductVisualizationGameLiftStreams via CICD.
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as Constructs from 'constructs';
import * as policies from '../policies';
import * as constants from '../constants';
import * as S3 from 'aws-cdk-lib/aws-s3';
import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
import ContainerImageRepo from '../ecr.repo';

export default class CICDPipelineIAMPolicies extends Constructs.Construct {
  readonly props: Props;

  readonly allowCDK: IAM.PolicyStatement;
  readonly allowGetInfoFor: IAM.PolicyStatement;
  readonly allowSSM: IAM.PolicyStatement;
  readonly allowConfigureWaf: IAM.PolicyStatement;
  readonly allowSourceCodeBucketAccess: IAM.PolicyStatement;

  readonly allowWebsiteBucketAccess?: IAM.PolicyStatement;
  readonly allowAppBucketAccess?: IAM.PolicyStatement;
  readonly allowCloudFrontInvalidationAccess?: IAM.PolicyStatement;
 
  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);

    this.props = props;

    // Needed to use the CDK in CodeBuild. 
    // We don't like using saved CDK context.json, but alternatively you can. See: 
    // * https://stackoverflow.com/questions/71836645/cannot-assume-lookup-role
    // * https://stackoverflow.com/questions/68275460/default-credentials-can-not-be-used-to-assume-new-style-deployment-roles
    this.allowCDK = policies.allowCDK(props.stage);

    // Needed to either:
    // * lookup other Cfn stack info and exports
    // * synth or deploy via CDK
    // * manage ECR images via CDK
    this.allowGetInfoFor = new IAM.PolicyStatement({
      actions: [
        'cloudformation:DescribeStacks',
        'ec2:DescribeVpcs', 
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeAvailabilityZones',
        'ecr:DescribeRepositories',
        'ecr:DescribeImages',
        'ecr:GetAuthorizationToken',
        'ssm:GetParameter'
      ],
      resources: ['*']
    });

    // FIXME Scope to the parameters used.
    this.allowSSM = new IAM.PolicyStatement({
      actions: ['ssm:PutParameter', 'ssm:GetParameter'],
      resources: ['*']
    });

    // See: https://stackoverflow.com/questions/70829639/awscdk-awswaf-logging-configuration-fails-to-deploy
    this.allowConfigureWaf = new IAM.PolicyStatement({
      actions: [
        'wafv2:CreateApiKey',
        'wafv2:AssociateWebACL',
        'wafv2:CreateWebACL',
        'wafv2:DeleteWebACL',
        'wafv2:DescribeManagedRuleGroup',
        'wafv2:DisassociateWebACL',
        'wafv2:Get*',
        'wafv2:List*',
        'wafv2:UpdateWebACL',
        'wafv2:GetLoggingConfiguration',
        'wafv2:ListLoggingConfiguration',
        'wafv2:PutLoggingConfiguration',
        'wafv2:DeleteLoggingConfiguration',
        'cloudwatch:DeleteAlarms',
        'cloudwatch:Describe*',
        'cloudwatch:DisableAlarmActions',
        'cloudwatch:EnableAlarmActions',
        'cloudwatch:GetDashboard',
        'cloudwatch:ListDashboards',
        'cloudwatch:PutDashboard',
        'cloudwatch:DeleteDashboards',
        'cloudwatch:GetMetricData',
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics',
        'cloudwatch:PutMetricAlarm',
        'cloudwatch:PutMetricData',
        'iam:CreateServiceLinkedRole'
      ],
      resources: ['*']
    });

    this.allowSourceCodeBucketAccess = policies.allowBucketReadAccess(this.props.cicdSourceBucket.bucketArn);

    // Website S3 bucket gets created after initial deploy, 
    //  so pipeline needs to update its permissions after it's created.
    if (props.selfMutatePipeline) {
      console.debug('websiteBucket', props.websiteBucket ? true : false);
      this.allowWebsiteBucketAccess = policies.allowBucketReadWriteAccess(this.props.websiteBucket?.bucketArn!);

      // App bucket gets created after initial deploy, 
      //  so pipeline needs to update its permissions after it's created.
      console.debug('appBucket', props.appBucket ? true : false);
      this.allowAppBucketAccess = policies.allowBucketReadWriteAccess(this.props.appBucket?.bucketArn!);

      // CloudFront distribution gets created after initial initial deploy, 
      //  so pipeline needs to update its permissions after it's created.
      console.debug('cloudfrontDistribution', props.cloudfrontDistribution ? true : false);
      this.allowCloudFrontInvalidationAccess = new IAM.PolicyStatement({
        actions: [
          'cloudfront:UpdateDistribution',
          'cloudfront:DeleteDistribution',
          'cloudfront:CreateInvalidation'
        ],
        resources: [`arn:aws:cloudfront::${props.stage.getConfig().accountID}:distribution/${this.props.cloudfrontDistribution?.distributionId}`]
      });
    }
  }

  getAllAllowed(): IAM.PolicyStatement[] {
    const allowedPolicies = [
      this.allowCDK,
      this.allowGetInfoFor,
      this.allowSSM,
      this.allowConfigureWaf,
      this.allowSourceCodeBucketAccess
    ];

    if (this.allowWebsiteBucketAccess) { allowedPolicies.push(this.allowWebsiteBucketAccess); }
    if (this.allowAppBucketAccess) { allowedPolicies.push(this.allowAppBucketAccess); }
    if (this.allowCloudFrontInvalidationAccess) { allowedPolicies.push(this.allowCloudFrontInvalidationAccess); }

    return allowedPolicies;
  }
}

interface Props extends constants.CommonProps {
  readonly selfMutatePipeline: boolean;
  readonly cicdSourceBucket: S3.IBucket;
  readonly cicdContainerImageRepo: ContainerImageRepo;
  readonly websiteBucket?: S3.IBucket;
  readonly appBucket?: S3.IBucket;
  readonly cloudfrontDistribution?: CloudFront.IDistribution;
}