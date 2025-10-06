#! node
// This file is responsible for defining the CDK app entrypoint for the backend.
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import AppStage from '../stage';
import { ThreeDProductVisualizationGameLiftStreamsBackendStack } from '../cfn-stacks/backend';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as cdkContext from '../cdk.context'; 

const app = new cdk.App();

// Provided at runtime.
const cdkAction = cdkContext.getValidContext(app, 'cdk-action')!;
const cdkNag = (cdkContext.getValidContext(app, 'cdk-nag') === 'true');
const stageName = cdkContext.getValidContext(app, 'stage')!;
const deployId = cdkContext.getValidContext(app, 'deploy-id')!;
const destroy = cdkContext.getValidContext(app, 'destroy')! === 'true';
const appFilesUploaded = cdkContext.getValidContext(app, 'app-files-uploaded')! === 'true';

const stage = new AppStage(app, 'stage', { name: stageName, deployId, cdkAction, description: "Guidance for 3D product visualization (SO9157)" });

new ThreeDProductVisualizationGameLiftStreamsBackendStack(app, stage.getResourceName({ resourceName: stage.getConfig().backendCfnStackSuffis }), { stage, appFilesUploaded, destroy });

// Add tags to all created resources.
cdk.Tags.of(app).add('cdk-group', stage.getResourcePrefix());
cdk.Tags.of(app).add('cdk-app', stage.getResourceName({ resourceName: stage.getConfig().backendCfnStackSuffis }));

if (cdkNag) { cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true })); }

app.synth();