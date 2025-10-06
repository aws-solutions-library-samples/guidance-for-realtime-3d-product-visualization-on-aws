// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
import * as CodePipeline from 'aws-cdk-lib/aws-codepipeline';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as CodePipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as CodeBuild from 'aws-cdk-lib/aws-codebuild';
import * as cdk from 'aws-cdk-lib';
import * as constants from '../constants';
import * as Constructs from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import * as cdkNagSuppressions from '../cdk.nag.suppressions';

export default class CICDBuildStep extends Constructs.Construct {
  props: Props;
  // See: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html
  private defaultBuildImage = CodeBuild.LinuxBuildImage.AMAZON_LINUX_2_4;
  private readonly defaultTimeout = cdk.Duration.minutes(25);
  buildProject?: CodeBuild.PipelineProject;

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, `CICDBuildStep${id}`);

    this.props = props;
  }

  getAction(): CodePipelineActions.CodeBuildAction {
    this.buildProject = this.getBuildProject();

    this.props.policyStatements?.forEach(policyStatement => { 
      console.debug(this.props.actionName, policyStatement.actions);
      this.buildProject?.addToRolePolicy(policyStatement); 
    });

    NagSuppressions.addResourceSuppressions(this.buildProject, [
      cdkNagSuppressions.suppressCodeBuildKMSUsage
    ]);
  
    const buildAction = new CodePipelineActions.CodeBuildAction({ 
      actionName: this.props.actionName,
      runOrder: this.props.runOrder || 1,
      project: this.buildProject, 
      input: this.props.input,
      extraInputs: this.props.extraInputs, 
      outputs: this.props.outputs
    });

    return buildAction;
  }

  private getBuildProject(): CodeBuild.PipelineProject {
    let installCommands = this.getDefaultCommands();
    installCommands = installCommands.concat(this.props.installCommands);

    let buildCommands = this.getDefaultCommands();
    buildCommands = buildCommands.concat(this.props.buildCommands);

    return new CodeBuild.PipelineProject(this, this.props.actionName, {
      projectName: this.props.stage.getResourceName({ resourceName: this.props.actionName }), // FIXME Name build prrojects.
      environmentVariables: this.props.environmentVariables,
      timeout: this.props.timeout || this.defaultTimeout,
      // Based on: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
      buildSpec: CodeBuild.BuildSpec.fromObject({
        'run-as': this.props.runAs,
        env: {
          shell: this.props.osType === 'windows' ? 'powershell' : 'bash',
          variables: {}, // Need empty shell vars to force shell? See: https://github.com/aws/aws-codebuild-docker-images/issues/388
          'exported-variables': []
        },
        version: '0.2',
        phases: { 
          install: { commands: installCommands },
          build: { commands: buildCommands } 
        },
        artifacts: this.props.artifacts,
      }),
      environment: {
        privileged: this.props.osType === 'windows' ? false : true, // PrivilegedMode is not supported for WINDOWS_SERVER_2019_CONTAINER projects.
        buildImage: this.props.buildImage || this.defaultBuildImage,
        computeType: CodeBuild.ComputeType.SMALL
      }
    });
  }

  private getDefaultCommands(): string[] {
    if (this.props.osType === 'windows') {
      return [
        'gci env:* | sort-object name',
        'echo $env:PATH',
        'pwd',
        'ls',
        'cd $env:CODEBUILD_SRC_DIR'
      ];
    } 

    return [
      'echo $SHELL',
      'printenv',
      'echo $PATH',
      'pwd',
      'ls',
      'cd $CODEBUILD_SRC_DIR'
    ];
  }
}

interface Props extends constants.CommonProps {
  readonly runAs?: string;
  readonly actionName: string;
  readonly runOrder?: number;
  readonly input: CodePipeline.Artifact;
  readonly extraInputs?: CodePipeline.Artifact[];
  readonly osType?: OSType;
  readonly buildImage?: CodeBuild.IBuildImage;
  readonly installCommands: string[];
  readonly buildCommands: string[];
  readonly environmentVariables?: {
    [name: string]: CodeBuild.BuildEnvironmentVariable;
  };
  readonly policyStatements?: IAM.PolicyStatement[];
  artifacts?: any;
  readonly outputs?: CodePipeline.Artifact[];
  readonly timeout?: cdk.Duration;
}

type OSType = 'linux' | 'windows';