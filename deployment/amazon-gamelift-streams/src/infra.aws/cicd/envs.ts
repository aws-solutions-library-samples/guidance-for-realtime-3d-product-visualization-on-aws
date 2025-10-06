// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
import * as CodePipeline from 'aws-cdk-lib/aws-codepipeline';
import * as Constructs from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as CodeBuild from 'aws-cdk-lib/aws-codebuild';
import CICDBuildStep from './build-step';
import { BuildCommand } from './pipeline-step-builder';
import * as constants from '../constants';
import ContainerImageRepo from '../ecr.repo';

export default class CICDEnvs extends Constructs.Construct implements BuildEnvs {
  private readonly props: Props;

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);

    this.props = props;
  }

  getEnv(env: Env, buildCommand: BuildCommand): CICDBuildStep {
    if (env === 'deploy') { return this.standardEnv(buildCommand); }

    return this.standardEnv(buildCommand);
  }

  private standardEnv(buildCommand: BuildCommand): CICDBuildStep {
    return new CICDBuildStep(this, buildCommand.actionName, {
      stage: this.props.stage,
      actionName: buildCommand.actionName,
      input: this.props.sourceCode,
      osType: 'linux',
      buildImage: CodeBuild.LinuxBuildImage.STANDARD_7_0,
      installCommands: [
        // Setup Node.js. See: https://github.com/aws/aws-codebuild-docker-images/issues/580 and https://github.com/aws/aws-codebuild-docker-images/issues/631
        'n 20',
        
        // Setup Docker. See: https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker-custom-image.html#sample-docker-custom-image-files
        'nohup dockerd --host=unix:///var/run/docker.sock --host=tcp://127.0.0.1:2375 &',
        'timeout 15 sh -c "until docker info; do echo .; sleep 1; done"',

        `aws ecr get-login-password --region ${this.props.stage.getConfig().region} | docker login -u AWS --password-stdin "https://$(aws sts get-caller-identity --query 'Account' --output text).dkr.ecr.${this.props.stage.getConfig().region}.amazonaws.com"`,

        // You _could_ build the placeholder application in an AWS CodeBuild environment that has its build dependencies installed,
        //  but given that this is a sample, we opted to "docker build" the placeholder application's Docker container image on each deploy.
      ], 
      timeout: cdk.Duration.hours(4),
      buildCommands: [buildCommand.exec],
      environmentVariables: {
        cicd_container_image_repo_name: {
          value: this.props.cicdContainerImageRepo.repo.repositoryName
        }
      },
      outputs: buildCommand.outputs,
      policyStatements: buildCommand.policyStatements // Step inherits the pipeline permissions.
    });
  }
}

interface Props extends constants.CommonProps {
  readonly sourceCode: CodePipeline.Artifact;
  readonly cicdContainerImageRepo: ContainerImageRepo;
}

export type Env = 'deploy';

export interface BuildEnvs {
  getEnv(env: string, buildCommand: BuildCommand): CICDBuildStep;
}