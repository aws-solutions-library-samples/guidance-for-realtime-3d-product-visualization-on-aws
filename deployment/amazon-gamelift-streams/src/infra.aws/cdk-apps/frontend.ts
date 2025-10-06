#! node
// This file is responsible for defining the CDK app entrypoint which defines backend resources.
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import AppStage from '../stage';
import { ThreeDProductVisualizationGameLiftStreamsFrontendStack } from '../cfn-stacks/frontend';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as cdkContext from '../cdk.context';

const app = new cdk.App();

// Provided at runtime.
const cdkAction = cdkContext.getValidContext(app, 'cdk-action')!;
const cdkNag = (cdkContext.getValidContext(app, 'cdk-nag') === 'true');
const stageName = cdkContext.getValidContext(app, 'stage')!;
const deployId = cdkContext.getValidContext(app, 'deploy-id')!;
const appFilesUploaded = cdkContext.getValidContext(app, 'app-files-uploaded')! === 'true';
const edgeDistDir = cdkContext.getValidContext(app, 'edge-dist-dir')!;
const destroy = cdkContext.getValidContext(app, 'destroy')! === 'true';
const glsStreamGroupId = cdkContext.getValidContext(app, 'gls-stream-group-id');
const glsApplicationId = cdkContext.getValidContext(app, 'gls-application-id');

// Taken from somewhere: AWS Lambda@edge functions must use the Region US East (N. Virginia).
// Since those resources are deployed as frontend request middleware, this AWS CloudFormation stack
//  must also be deployed in this region.
// You could alternatively manage the AWS Lambda@edge functions in a separate stack.
const stage = new AppStage(app, 'stage', { name: stageName, deployId, cdkAction, region: 'us-east-1', description: "Guidance for 3D product visualization - Frontend Stack (SO9157)" });

new ThreeDProductVisualizationGameLiftStreamsFrontendStack(app, stage.getResourceName({ resourceName: stage.getConfig().frontendCfnStackSuffix }), { stage, appFilesUploaded, edgeDistDir, glsStreamGroupId, glsApplicationId, destroy });

// Add tags to all created resources.
cdk.Tags.of(app).add('cdk-group', stage.getResourcePrefix());
cdk.Tags.of(app).add('cdk-app', stage.getResourceName({ resourceName: stage.getConfig().frontendCfnStackSuffix }));

if (cdkNag) { cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true })); }

app.synth();