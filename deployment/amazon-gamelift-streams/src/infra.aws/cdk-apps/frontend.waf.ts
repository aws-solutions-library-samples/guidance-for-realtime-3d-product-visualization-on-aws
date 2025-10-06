#! node
// This file is responsible for defining the CDK app entrypoint which defines frontend WAF resources.
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import AppStage from '../stage';
import { ThreeDProductVisualizationGameLiftStreamsFrontendWAFStack } from '../cfn-stacks/frontend.waf';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as cdkContext from '../cdk.context'; 

const app = new cdk.App();

// Provided at runtime.
const cdkAction = cdkContext.getValidContext(app, 'cdk-action')!;
const cdkNag = (cdkContext.getValidContext(app, 'cdk-nag') === 'true');
const stageName = cdkContext.getValidContext(app, 'stage')!;
const deployId = cdkContext.getValidContext(app, 'deploy-id')!;
const restrictToPublicIp = cdkContext.getValidContext(app, 'restrict-to-public-ip')!;

// Taken from somewhere: WAF is available globally for Amazon CloudFront distributions, 
//  but you must use the Region US East (N. Virginia) to create your web ACL and 
//  any resources used in the web ACL, such as rule groups, IP sets, and regex pattern sets.
const stage = new AppStage(app, 'stage', { name: stageName, deployId, cdkAction, region: 'us-east-1', description: "Guidance for 3D product visualization - WAF Stack (SO9157)" });

new ThreeDProductVisualizationGameLiftStreamsFrontendWAFStack(app, stage.getResourceName({ resourceName: stage.getConfig().frontendWafCfnStackSuffix }), { stage, restrictToPublicIp });

// Add tags to all created resources.
cdk.Tags.of(app).add('cdk-group', stage.getResourcePrefix());
cdk.Tags.of(app).add('cdk-app', stage.getResourceName({ resourceName: stage.getConfig().frontendWafCfnStackSuffix }));

// FIXME cdk-nag errors
if (cdkNag) { cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true })); }

app.synth();