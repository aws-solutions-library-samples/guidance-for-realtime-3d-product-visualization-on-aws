// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining the backend AWS infra stack.
import * as cdk from 'aws-cdk-lib';
import * as Constructs from 'constructs';
import * as constants from '../constants';
import * as GameLiftStreams from 'aws-cdk-lib/aws-gameliftstreams';
import * as S3 from 'aws-cdk-lib/aws-s3';
import * as IAM from 'aws-cdk-lib/aws-iam';
import { getRemovalPolicy } from '../resource';
import Bucket from '../s3.bucket';
import { supportedAmazonGameliftRegions } from '../../edge/nearest-aws-region';

export class ThreeDProductVisualizationGameLiftStreamsBackendStack extends cdk.Stack {
  readonly appAccessLogsBucket: Bucket;
  readonly appBucket: Bucket;
  readonly exported?: CfnExports;

  constructor(scope: cdk.App, id: string, props: Props) {
    super(scope, id, props.stage.stackProps);

    this.appAccessLogsBucket = new Bucket(this, 'app-access-logs', {
      removalPolicy: getRemovalPolicy(props.stage)
    });

    this.appBucket = new Bucket(this, 'app', { // App binary and any files it needs get uploaded here.
      serverAccessLogsBucket: this.appAccessLogsBucket,
      removalPolicy: getRemovalPolicy(props.stage)
    });
    this.appBucket.bucket.grantPut(new IAM.ServicePrincipal('gameliftstreams.amazonaws.com'));

    if (!props.appFilesUploaded || props.destroy) { // Otherwise Amazon GameLiftStreams will throw error: "No S3 objects were found at the specified source URI".
      this.exported = {
          appAccessLogsBucketName: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().appAccessLogsBucketNameCfnExportNameSuffix }), {
          value: this.appAccessLogsBucket.bucket.bucketName,
          exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().appAccessLogsBucketNameCfnExportNameSuffix })
        }),
        appBucket: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().appBucketNameCfnExportNameSuffix }), {
          value: this.appBucket.bucket.bucketName,
          exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().appBucketNameCfnExportNameSuffix })
        })
      };

      return;
    }

    if (!supportedAmazonGameliftRegions.map(region => region.code).includes(props.stage.getConfig().region.toLowerCase())) {
      throw new Error('Invalid Amazon GameLift Streams region. Please see https://docs.aws.amazon.com/gameliftstreams/latest/developerguide/regions-quotas-rande.html for supported regions.');
    }
    
    const application = new GameLiftStreams.CfnApplication(this, 'application', {
      applicationSourceUri: `s3://${this.appBucket.bucket.bucketName}/app-files/`,
      description: props.stage.getResourceName({ resourceName: 'application' }),
      executablePath: 'app',
      runtimeEnvironment: {
        type: 'UBUNTU',
        version: '22_04_LTS'
      }
    });
    if (getRemovalPolicy(props.stage)) { application.applyRemovalPolicy(getRemovalPolicy(props.stage)); }

    const streamGroup = new GameLiftStreams.CfnStreamGroup(this, 'stream-group', {
      description: props.stage.getResourceName({ resourceName: 'stream-group' }),
      locationConfigurations: [{
        locationName: props.stage.getConfig().region,
        alwaysOnCapacity: 2,
        onDemandCapacity: 0,
      }],
      streamClass: 'gen4n_ultra', // Minimum stream class the placeholder app will work with.
      defaultApplication: {
        arn: application.attrArn,
        id: application.attrId
      },
      tags: {
        tagsKey: 'tags'
      }
    });
    if (getRemovalPolicy(props.stage)) { streamGroup.applyRemovalPolicy(getRemovalPolicy(props.stage)); }

    application.node.addDependency(this.appBucket.bucket);
    streamGroup.node.addDependency(application);

    this.exported = {
      appAccessLogsBucketName: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().appAccessLogsBucketNameCfnExportNameSuffix }), {
        value: this.appAccessLogsBucket.bucket.bucketName,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().appAccessLogsBucketNameCfnExportNameSuffix })
      }),
      appBucket: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().appBucketNameCfnExportNameSuffix }), {
        value: this.appBucket.bucket.bucketName,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().appBucketNameCfnExportNameSuffix })
      }),
      applicationId: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().glsApplicationIdCfnExportNameSuffix }), {
        value: application.attrArn,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().glsApplicationIdCfnExportNameSuffix })
      }),
      streamGroupId: new cdk.CfnOutput(this, props.stage.getResourceName({ resourceName: props.stage.getConfig().glsStreamGroupIdCfnExportNameSuffix }), {
        value: streamGroup.attrArn,
        exportName: props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().glsStreamGroupIdCfnExportNameSuffix })
      })
    };
  }
}

interface Props extends constants.CommonProps {
  readonly appFilesUploaded: boolean;
  readonly destroy: boolean;
}

interface CfnExports {
  readonly appAccessLogsBucketName: cdk.CfnOutput; // Exported for cleanup.
  readonly appBucket: cdk.CfnOutput; // Exported so we lookup to sync app files during deploy and also cleanup.
  readonly applicationId?: cdk.CfnOutput; // Exported so we can use to manage stream sessions.
  readonly streamGroupId?: cdk.CfnOutput; // Exported so we can use to manage stream sessions.
}

// Exported values imported in other cdk cfn constructs.
export class ThreeDProductVisualizationGameLiftStreamsBackendStackCfnExports extends Constructs.Construct {
  readonly appBucket: S3.IBucket; // Imported so we can self-mutate CICD pipeline to give it backend uplaod access.
  readonly glsStreamGroupId: string; // Imported so we can add to edge function env variables.
  readonly glsApplicationId: string; // Imported so we can add to edge function env variables.

  constructor(scope: Constructs.Construct, id: string, props: CfnExportProps) {
    super(scope, id);

    const appBucketName = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().appBucketNameCfnExportNameSuffix })).toString();
    console.debug('appBucketName', appBucketName);
    this.appBucket = S3.Bucket.fromBucketAttributes(this, 'imported-app-bucket', {
      bucketName: appBucketName
    });

    this.glsStreamGroupId = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().glsStreamGroupIdCfnExportNameSuffix })).toString();
    this.glsApplicationId = cdk.Fn.importValue(props.stage.getCfnExportResourceName({ resourceName: props.stage.getConfig().glsApplicationIdCfnExportNameSuffix })).toString();
  }
}

interface CfnExportProps extends constants.CommonProps {}