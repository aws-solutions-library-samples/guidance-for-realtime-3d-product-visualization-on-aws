// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining the frontend AWS infra stack.
import * as cdk from 'aws-cdk-lib';
import * as Constructs from 'constructs';
import * as constants from '../constants';
//import * as S3 from 'aws-cdk-lib/aws-s3';
//import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
import ThreeDProductVisualizationGameLiftStreamsWebsiteAndCDN from '../frontend/website-and-cdn';
import Env from '../env';
import { NagSuppressions } from 'cdk-nag';
import * as cdkNagSuppressions from '../cdk.nag.suppressions';

export class ThreeDProductVisualizationGameLiftStreamsFrontendStack extends cdk.Stack {
  readonly exported?: CfnExports;

  constructor(scope: cdk.App, id: string, props: Props) {
    super(scope, id, props.stage.stackProps);

    const env = new Env(this, 'env', props);
    const websiteAndCDN = new ThreeDProductVisualizationGameLiftStreamsWebsiteAndCDN(this, 'website', { ...props, env });

    // cdk nag suppressions that we can't seem to use constructs for:
    const cdkNagResourcePrefix = `/${props.stage.getConfig().cfnPrefix}-${props.stage.name}-${props.stage.getConfig().frontendCfnStackSuffix}-${props.stage.deployId}`;
    
    if (!props.destroy) {
      NagSuppressions.addResourceSuppressionsByPath(this, `${cdkNagResourcePrefix}/website/stream-session-middleware-fn/edge-fn/Fn/ServiceRole/Resource`, [
        // The AWS CDK provides a construct with a managed policy in use.
        // In order to remove the managed policy Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole, 
        //  you'll need to scope down the policy to the default log group and its streams, 
        //  or choose a custom log group and configure the edge function logging to use it.
        cdkNagSuppressions.suppressManagedPolicy,
        // The AWS CDK provides a construct with a wildcard in use.
        cdkNagSuppressions.suppressWildcardInPolicy
      ]);

      // The AWS CDK provides a construct with a managed policy in use.
      NagSuppressions.addResourceSuppressionsByPath(this, `${cdkNagResourcePrefix}/website/stream-session-middleware-fn/edge-fn/Fn/ServiceRole/DefaultPolicy/Resource`, [
        cdkNagSuppressions.suppressWildcardInPolicy
      ]);

      NagSuppressions.addResourceSuppressionsByPath(this, `${cdkNagResourcePrefix}/website/stream-session-middleware-fn/edge-fn/Fn/Resource`, [
        cdkNagSuppressions.suppressNonLatestLambdaRuntime
      ]);
    }

    // TODO try move out.
    NagSuppressions.addResourceSuppressionsByPath(this, `${cdkNagResourcePrefix}/website/cloudfront-distribution/Resource`, [
      cdkNagSuppressions.suppressCloudFrontTLSVulnerabilitiesViewerConnection,
      cdkNagSuppressions.suppressCloudFrontTLSVulnerabilities
    ]);

    this.exported = {
      cloudFrontDistributionAccessLogsBucketName: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().cloudFrontDistributionAccessLogsBucketNameCfnExportNameSuffix }), {
        value: websiteAndCDN.cloudFrontDistributionAccessLogsBucket.bucket.bucketName,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().cloudFrontDistributionAccessLogsBucketNameCfnExportNameSuffix })
      }),
      websiteBucketName: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().websiteBucketNameCfnExportNameSuffix }), {
        value: websiteAndCDN.websiteBucket.bucket.bucketName,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().websiteBucketNameCfnExportNameSuffix })
      }),

      appURL: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().websiteURLCfnExportNameSuffix }), {
        value: websiteAndCDN.cloudFrontDistribution.distributionDomainName,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().websiteURLCfnExportNameSuffix })
      }),
      distributionId: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().distributionIdCfnExportNameSuffix }), {
        value: websiteAndCDN.cloudFrontDistribution.distributionId,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().distributionIdCfnExportNameSuffix })
      })
    };
  }
}

interface Props extends constants.CommonProps {
  readonly appFilesUploaded: boolean;
  readonly edgeDistDir: string;
  readonly destroy: boolean;
  readonly glsStreamGroupId?: string;
  readonly glsApplicationId?: string;
}

interface CfnExports {
  readonly cloudFrontDistributionAccessLogsBucketName: cdk.CfnOutput; // Exported so we can cleanup.
  readonly websiteBucketName: cdk.CfnOutput; // Exported so we lookup to sync website files during deploy and also cleanup.

  readonly appURL: cdk.CfnOutput; // Exported for debugging.
  readonly distributionId: cdk.CfnOutput; // Exported so we can invalidate CloudFront distribution on website deploy.
}

// Exported values imported in other cdk cfn constructs.
export class ThreeDProductVisualizationGameLiftStreamsFrontendStackCfnExports extends Constructs.Construct {
  //readonly websiteBucket: S3.IBucket; // Imported so we can self-mutate CICD pipeline to give it frontend deploy access.
  //readonly cloudfrontDistribution: CloudFront.IDistribution; // Imported so we can authorize CICD to invalidate it.

  constructor(scope: Constructs.Construct, id: string, _props: CfnExportProps) {
    super(scope, id);

    // We now just pass these in because of the stacks that need to do the lookup being cross-region.
    /*
    const websiteBucketName = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().websiteBucketNameCfnExportNameSuffix })).toString();
    console.debug('websiteBucketName', websiteBucketName);
    this.websiteBucket = S3.Bucket.fromBucketAttributes(this, 'imported-website-bucket', {
      bucketName: websiteBucketName
    });
   
    const appURL = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().websiteURLCfnExportNameSuffix })).toString();
    const distributionId = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().distributionIdCfnExportNameSuffix })).toString();
    console.debug('distributionId', distributionId);
    this.cloudfrontDistribution = CloudFront.Distribution.fromDistributionAttributes(this, 'imported-distribution', { domainName: appURL, distributionId });
    */
  }
}

interface CfnExportProps extends constants.CommonProps {}