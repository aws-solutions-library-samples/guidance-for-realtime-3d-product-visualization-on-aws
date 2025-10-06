// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining our CICD pipeline.
import * as CodePipeline from 'aws-cdk-lib/aws-codepipeline';
import * as CodePipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as Constructs from 'constructs';
import { CICDPipelineStepBuilder } from './pipeline-step-builder';
import CICDPipelineIAMPolicies from './policies';
import * as constants from '../constants';
import CICDEnvs from './envs';
import Bucket from '../s3.bucket';
import { getRemovalPolicy } from '../resource';
import * as S3 from 'aws-cdk-lib/aws-s3';
import * as CloudFront from 'aws-cdk-lib/aws-cloudfront';
//import { ThreeDProductVisualizationGameLiftStreamsBackendStackCfnExports } from '../cfn-stacks/backend';
//import { ThreeDProductVisualizationGameLiftStreamsFrontendStackCfnExports } from '../cfn-stacks/frontend';
import ContainerImageRepo from '../ecr.repo';

export default class CICDPipeline extends Constructs.Construct {
  private readonly props: constants.CommonProps;
  private readonly pipeline: CodePipeline.Pipeline;
  private readonly pipelineSteps: CodePipeline.StageProps[] = [] as CodePipeline.StageProps[];
  private readonly triggerSourceCode: CodePipeline.Artifact;
  private readonly pipelineIAMPolicies: CICDPipelineIAMPolicies;
  private readonly envs: CICDEnvs;

  readonly sourceCodeBucket: Bucket;

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);

    this.props = props;

    // Source code gets uploaded here to start CICD.
    this.sourceCodeBucket = new Bucket(this, 'source-code-bucket', {
      removalPolicy: getRemovalPolicy(props.stage)
    });

    // Not used but needed.
    const artifactBucket = new Bucket(this, 'artifact-bucket', {
      removalPolicy: getRemovalPolicy(props.stage)
    });

    this.pipeline = new CodePipeline.Pipeline(this, 'codepipeline', {
      pipelineName: props.stage.getResourceName({ resourceName: 'pipeline' }),
      restartExecutionOnUpdate: true,
      artifactBucket: artifactBucket.bucket,
      enableKeyRotation: true
    });

    // This approach doesn't work if the CICD stack is in a different region and CDK app than the frontend/backend stacks (ours are).
    // Instead we just did the cfn export lookup before invoking the CDK app.
    //const backendStackCfnExports = new ThreeDProductVisualizationGameLiftStreamsBackendStackCfnExports(this, 'backend-cfn-exports', props);
    //const frontendStackCfnExports = new ThreeDProductVisualizationGameLiftStreamsFrontendStackCfnExports(this, 'frontend-cfn-exports', props);

    this.pipelineIAMPolicies = new CICDPipelineIAMPolicies(this, 'iam-policies', { 
      stage: props.stage, 
      selfMutatePipeline: props.selfMutatePipeline,
      cicdContainerImageRepo: props.cicdContainerImageRepo,
      cicdSourceBucket: this.sourceCodeBucket.bucket,
      websiteBucket: props.websiteBucket,
      appBucket: props.appBucket,
      cloudfrontDistribution: props.cloudfrontDistribution,
      //websiteBucket: frontendStackCfnExports?.websiteBucket, // Only exists after CICD deploys this.
      //appBucket: backendStackCfnExports?.appBucket, // Only exists after CICD deploys this.
      //cloudfrontDistribution: frontendStackCfnExports?.cloudfrontDistribution, // Only exists after CICD deploys this.
    });

    // CodePipeline only supports single files as input (i.e. zip files for groups of files),
    //  but we use "s3 sync" to get files to CICD for cost reasons.
    // We'll have to download the actual source manually once we upload a zip file of minimum size to trigger CICD.
    this.triggerSourceCode = new CodePipeline.Artifact('trigger-source-code');

    // A pipeline and its steps might have different access restrictions.
    // For our purposes, we configure the pipeline and each step to have the _same_ access.
    this.pipelineIAMPolicies.getAllAllowed().forEach(policy => this.pipeline.addToRolePolicy(policy));

    this.envs = new CICDEnvs(this, 'envs', { 
      stage: props.stage, 
      sourceCode: this.triggerSourceCode, 
      cicdContainerImageRepo: props.cicdContainerImageRepo
    });

    const pipelineStepBuilder = new CICDPipelineStepBuilder(this, 'pipeline-step', { 
      stage: props.stage, 
      sourceCode: this.triggerSourceCode, 
      pipelineIAMPolicies: this.pipelineIAMPolicies.getAllAllowed(),
      envs: this.envs
    });

    this.pipelineSteps.push(this.getSourceCodeStep(this.sourceCodeBucket.bucket));

    this.pipelineSteps.push(pipelineStepBuilder.createStepFromCommands('Build-And-Deploy-Main', [
      { actionName: 'Build-And-Deploy', exec: `ls -al $CODEBUILD_SRC_DIR && cd $CODEBUILD_SRC_DIR/amazon-gamelift-streams && make -f makefile.aws stage=${this.props.stage.name} deploy/from-cicd`, env: 'deploy', runOrder: 1 }
    ]));

    this.pipelineSteps.forEach(step => this.pipeline.addStage(step));
  }

  private getSourceCodeStep(bucket: S3.IBucket): CodePipeline.StageProps {
    return { stageName: 'Get-Source', actions: [
      new CodePipelineActions.S3SourceAction({
        actionName: 'Trigger',
        bucket,
        bucketKey: 'cicd-trigger.zip',
        output: this.triggerSourceCode
      })
    ]};
  }
}

interface Props extends constants.CommonProps {
  readonly selfMutatePipeline: boolean;
  readonly cicdContainerImageRepo: ContainerImageRepo;
  readonly websiteBucket?: S3.IBucket;
  readonly appBucket?: S3.IBucket;
  readonly cloudfrontDistribution?: CloudFront.IDistribution;
}