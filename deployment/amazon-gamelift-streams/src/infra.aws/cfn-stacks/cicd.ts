// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining the cicd AWS infra stack.
import * as cdk from 'aws-cdk-lib';
import * as Constructs from 'constructs';
import * as constants from '../constants';
import AppStage from '../stage';
import CICDPipeline from '../cicd/pipeline';
import * as S3 from 'aws-cdk-lib/aws-s3';
import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
import ContainerImageRepo from '../ecr.repo';
import { NagSuppressions } from 'cdk-nag';
import * as cdkNagSuppressions from '../cdk.nag.suppressions';

export class ThreeDProductVisualizationGameLiftStreamsCICDStack extends cdk.Stack {
  readonly exported?: CfnExports;
  readonly websiteBucket?: S3.IBucket;
  readonly appBucket?: S3.IBucket;
  readonly cloudfrontDistribution?: CloudFront.IDistribution;

  constructor(scope: cdk.App, id: string, props: Props) {
    super(scope, id, props.stage.stackProps);

    const cicdContainerImageRepo = new ContainerImageRepo(this, 'cicd-image-repo', { 
      repositoryName: props.stage.getResourceName({ resourceName: 'cicd' }),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    if (props.websiteBucketName) {
      this.websiteBucket = S3.Bucket.fromBucketAttributes(this, 'imported-website-bucket', {
        bucketName: props.websiteBucketName
      });
    }

    if (props.appBucketName) {
      this.appBucket = S3.Bucket.fromBucketAttributes(this, 'imported-app-bucket', {
        bucketName: props.appBucketName
      });
    }

    if (props.appURL && props.distributionId) {
      this.cloudfrontDistribution = CloudFront.Distribution.fromDistributionAttributes(this, 'imported-distribution', { domainName: props.appURL, distributionId: props.distributionId });
    }

    const pipeline = new CICDPipeline(this, 'cicd-pipeline', { 
      stage: props.stage, 
      selfMutatePipeline: props.selfMutatePipeline, 
      cicdContainerImageRepo,
      websiteBucket: this.websiteBucket,
      appBucket: this.appBucket,
      cloudfrontDistribution: this.cloudfrontDistribution
    });

    // cdk nag suppressions that we can't seem to use constructs for:
    const cdkNagResourcePrefix = `/${props.stage.getConfig().cfnPrefix}-${props.stage.name}-${props.stage.getConfig().cicdCfnStackSuffix}-${props.stage.deployId}`;

    // Most of these wildcards are actually just complaining about e.g. s3:Get* in the policy statements we specified.
    NagSuppressions.addResourceSuppressionsByPath(this, `${cdkNagResourcePrefix}/cicd-pipeline/codepipeline/Role/DefaultPolicy/Resource`, [
      cdkNagSuppressions.suppressWildcardInPolicy
    ]);
    
    NagSuppressions.addResourceSuppressionsByPath(this, `${cdkNagResourcePrefix}/cicd-pipeline/codepipeline/Get-Source/Trigger/CodePipelineActionRole/DefaultPolicy/Resource`, [
      cdkNagSuppressions.suppressWildcardInPolicy
    ]);

    NagSuppressions.addResourceSuppressionsByPath(this, `${cdkNagResourcePrefix}/cicd-pipeline/envs/CICDBuildStepBuild-And-Deploy/Build-And-Deploy/Role/DefaultPolicy/Resource`, [
      cdkNagSuppressions.suppressWildcardInPolicy
    ]);

    this.exported = {
      sourceCodeBucketName: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().sourceCodeBucketNameCfnExportNameSuffix }), {
        value: pipeline.sourceCodeBucket.bucket.bucketName,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().sourceCodeBucketNameCfnExportNameSuffix })
      })
    };
  }
}

interface Props {
  readonly stage: AppStage;
  readonly selfMutatePipeline: boolean;
  readonly websiteBucketName?: string;
  readonly appBucketName?: string;
  readonly appURL?: string;
  readonly distributionId?: string;
}

interface CfnExports {
  readonly sourceCodeBucketName: cdk.CfnOutput; // Exported so we can try and empty before destroying resources.
}

// Exported values imported in other cdk cfn constructs.
export class ThreeDProductVisualizationGameLiftStreamsCICDStackCfnExports extends Constructs.Construct {
  readonly sourceCodeBucket: S3.IBucket; // Imported so we can grant access to content.

  constructor(scope: Constructs.Construct, id: string, props: constants.CommonProps) {
    super(scope, id);

    const sourceCodeBucketName = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().sourceCodeBucketNameCfnExportNameSuffix })).toString();
    this.sourceCodeBucket = S3.Bucket.fromBucketAttributes(this, 'imported-source-code-bucket', {
      bucketName: sourceCodeBucketName
    });
  }
}