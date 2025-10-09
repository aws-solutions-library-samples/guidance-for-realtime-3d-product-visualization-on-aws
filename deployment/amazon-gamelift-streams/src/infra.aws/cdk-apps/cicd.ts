#! node
// This file is responsible for defining the CDK app entrypoint for CICD.
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import AppStage from '../stage';
import { ThreeDProductVisualizationGameLiftStreamsCICDStack } from '../cfn-stacks/cicd';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as cdkContext from '../cdk.context'; 

const app = new cdk.App();

// Provided at runtime.
const cdkAction = cdkContext.getValidContext(app, 'cdk-action')!;
const cdkNag = (cdkContext.getValidContext(app, 'cdk-nag') === 'true');
const stageName = cdkContext.getValidContext(app, 'stage')!;
const deployId = cdkContext.getValidContext(app, 'deploy-id')!;
const selfMutatePipeline = cdkContext.getValidContext(app, 'self-mutate-pipeline')! === 'true';
const websiteBucketName = cdkContext.getValidContext(app, 'website-bucket-name');
const appBucketName = cdkContext.getValidContext(app, 'app-bucket-name');
const appURL = cdkContext.getValidContext(app, 'app-url');
const distributionId = cdkContext.getValidContext(app, 'distribution-id');

const stage = new AppStage(app, 'stage', { name: stageName, deployId, cdkAction, description: "Guidance for 3D product visualization - CI/CD Stack (SO9641)" });

new ThreeDProductVisualizationGameLiftStreamsCICDStack(app, stage.getResourceName({ resourceName: stage.getConfig().cicdCfnStackSuffix }), { 
  stage, 
  selfMutatePipeline, 
  websiteBucketName,
  appBucketName,
  appURL,
  distributionId
});

// Add tags to all created resources.
cdk.Tags.of(app).add('cdk-group', stage.getResourcePrefix());
cdk.Tags.of(app).add('cdk-app', stage.getResourceName({ resourceName: stage.getConfig().cicdCfnStackSuffix }));

if (cdkNag) { cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true })); }

app.synth();