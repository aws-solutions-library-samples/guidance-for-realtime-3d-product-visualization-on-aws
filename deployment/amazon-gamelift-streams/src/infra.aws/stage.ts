// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for mapping config in the <pvagls-src>/config/.env file to our infra stage config.
// It allows us to heavily type all our config values for each infra stage.
// In our case we just deploy to main, which is syntatic sugar for creating cfn stacks (specific prefixes) that manage resources (with specific prefixes).
// This pattern + typing has allowed me to manage application stacks in multiple stages and accounts the easiest so far.
import * as cdk from 'aws-cdk-lib';
import * as Constructs from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

import { getCustomCfnStackSynthesizer } from './custom-cfn-stack-synthesizer';

export default class AppStage extends Constructs.Construct {
  readonly name: string;
  readonly stackName?: string;
  readonly main: string = 'main';
  readonly deployId: string = '';
  readonly cdkAction: string;
  readonly stackProps: cdk.StackProps;
  readonly description?: string; 

  constructor(scope: Constructs.Construct, id: string, props: Props) {
    super(scope, id);

    this.name = props.name.toLowerCase();
    this.deployId = props.deployId.toLowerCase();
    this.cdkAction = props.cdkAction;

    // If you don't specify 'env', this stack will be environment-agnostic.
    // Account/Region-dependent features and context lookups will not work,
    //  but a single synthesized template can be deployed anywhere.
    // To use the current AWS CDK CLI configuration:
    //  env: { account: process.env.cdk_DEFAULT_ACCOUNT, region: process.env.cdk_DEFAULT_REGION },
    // For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html
    console.debug('CDK_DEFAULT_ACCOUNT', process.env.CDK_DEFAULT_ACCOUNT);
    console.debug('CDK_DEFAULT_REGION', process.env.CDK_DEFAULT_REGION);
    console.debug('stage account', this.getConfig().accountID);
    console.debug('stage region', this.getConfig().region);
    console.debug('stack props region override (OPTIONAL)', props.region);
    console.debug('stage config', JSON.stringify(this.getConfig(), null, 2));

    let region = this.getConfig().region;
    if (props.region) { region = props.region; } // Used to override region for things like certificates.

    // Rely on our own cdk resources so we don't create conflicts with other cdk-based application infra.
    const synthesizer = getCustomCfnStackSynthesizer('app', this.getConfig().cdkQualifier);
  
    if (props.stackName) {
      this.stackName = props.stackName;
      this.stackProps = {
        crossRegionReferences: true, // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#accessing-resources-in-a-different-stack-and-region
        synthesizer,
        env: { account: this.getConfig().accountID, region }, 
        stackName: props.stackName,
        description: props.description 
      };
    } else {
      this.stackProps = {
        crossRegionReferences: true, // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#accessing-resources-in-a-different-stack-and-region
        synthesizer,
        env: { account: this.getConfig().accountID, region },
        description: props.description 
      };
    }

    console.debug('stackProps', JSON.stringify(this.stackProps, null, 2));
  }

  getConfig(): IAWSStage { return getAWSStageConfig(this.name); }

  getResourcePrefix(): string { return `${this.getConfig().cfnPrefix}-${this.name}`; }

  /** Wrap resources names in unique stage information to make them "friendly". */
  getResourceName(props: { resourceName: string | undefined }): string {
    // FIXME Ideally this should never happen, but it does!
    // Rather than error, try creating the infra with a generated name. 
    //if (!resourceName) { throw new Error('Undefined resource name!'); }
    if (!props.resourceName) { 
      console.warn('resourceName undefined, generating one');
      
      props.resourceName = `undefined-${new Date().getTime()}`; 
    }

    return `${this.getResourcePrefix()}-${props.resourceName}-${this.getResourceSuffix()}`;
  }

  // Useful when both Alice and Bob deploy same configuration to same AWS account, e.g. 3dpvagls-main-backend-alice and 3dpvagls-main-backend-bob .
  getResourceSuffix() { return this.deployId; }

  // CloudFormation will automatically remove dashes, but be somewhat explicit.
  getCfnExportResourceName(props: { resourceName: string }): string {
    return `${this.getResourceName(props).replace(/-/g, '')}`;
  }
}

interface Props {
  readonly name: string;
  readonly deployId: string;
  readonly cdkAction: string;
  readonly stackName?: string; // Used to override stack name where each stack has a unique suffix.
  readonly region?: string; // Used to override our region config (say for required us-east-1 stacks).
  readonly description?: string;
}

export const getAWSStageConfig = (stageName?: any): IAWSStage => {
  const envFileContents = fs.readFileSync(path.resolve(process.cwd(), './config/.env')).toString();
  //console.debug('envFile', envFile);

  const env = fromFileContents<IDotEnv>(envFileContents, stageName);
  //console.debug('env', env);

  const baseStage = {
    cfnPrefix: env.aws_cfn_prefix,

    stageName,

    cicdCfnStackSuffix: env.aws_cicd_cfn_stack_suffix,
    backendCfnStackSuffis: env.aws_backend_cfn_stack_suffix,
    frontendWafCfnStackSuffix: env.aws_frontend_waf_cfn_stack_suffix,
    frontendCfnStackSuffix: env.aws_frontend_cfn_stack_suffix,
   
    // cicd
    sourceCodeBucketNameCfnExportNameSuffix: env.aws_cicd_source_code_bucket_name_cfn_export_name_suffix,

    // backend
    appAccessLogsBucketNameCfnExportNameSuffix: env.aws_backend_app_access_logs_bucket_name_cfn_export_name_suffix,
    appBucketNameCfnExportNameSuffix: env.aws_backend_app_bucket_name_cfn_export_name_suffix,
    glsApplicationIdCfnExportNameSuffix: env.aws_backend_gls_application_id_cfn_export_name_suffix,
    glsStreamGroupIdCfnExportNameSuffix: env.aws_backend_gls_stream_group_id_cfn_export_name_suffix,

    // waf
    wafIpSetIdCfnExportNameSuffix: env.aws_frontend_waf_ip_set_id_cfn_export_name_suffix,
    wafAclAttrArnCfnExportNameSuffix: env.aws_frontend_waf_web_acl_attr_arn_cfn_export_name_suffix,

    // frontend
    cloudFrontDistributionAccessLogsBucketNameCfnExportNameSuffix: env.aws_frontend_cloudfront_access_logs_bucket_name_cfn_export_name_suffix,
    websiteBucketNameCfnExportNameSuffix: env.aws_frontend_website_bucket_name_cfn_export_name_suffix,
    websiteURLCfnExportNameSuffix: env.aws_frontend_website_url_cfn_export_name_suffix,
    distributionIdCfnExportNameSuffix: env.aws_frontend_distribution_id_cfn_export_name_suffix
  } as IAWSStage;

  if (stageName === 'main') { 
    return {
      ...baseStage, 

      cliProfile: env.aws_main_cli_profile,
      region: env.aws_main_region,
      accountID: env.aws_main_account_id,
      deployID: env.aws_main_deploy_id,
      cdkQualifier: env.aws_main_cdk_qualifier
    } as IAWSStage;
  }

  throw new Error('No valid stage config found!');
};

/** Cast key=value file contents to a type. */
const fromFileContents = <T>(envFileContents: string, stageName?: string): T => {
  const keyValues: any = {};
  
  envFileContents.split(/\r?\n/).forEach(line => {
    if (line === '') { return; } // Ignore empty lines.
    if (line.startsWith('#')) { return; } // Ignore comments.
    const keyValue = line.split('=');
    
    if (keyValue[1]) {
      keyValue[1] = keyValue[1].split('#')[0].trim();
    }

    const keyOrValueIsUndefined = (!keyValue[0] || keyValue[0] === '') || (!keyValue[1] || keyValue[1] === '');

    if (keyOrValueIsUndefined && keyValue[0] && keyValue[0].indexOf('_secret_arn') === -1) { 
      // aws_local_... config keys may be empty.
      if (!stageName || stageName && stageName !== 'local' && !keyValue[0].includes('aws_local_')) { 
        console.warn('found invalid key or value', keyValue, stageName);
        throw new Error('config/.env file incorrectly configured'); 
      }
    }

    keyValues[keyValue[0]] = keyValue[1];
  });

  return keyValues as T;
}

export interface IAWSStage {
  readonly cfnPrefix: string;

  readonly stageName: string;

  readonly cliProfile: string;
  readonly region: string;
  readonly accountID: string;
  readonly deployID: string;
  readonly cdkQualifier: string;

  readonly cicdCfnStackSuffix: string;
  readonly backendCfnStackSuffis: string;
  readonly frontendWafCfnStackSuffix: string;
  readonly frontendCfnStackSuffix: string;
  readonly edgeCfnStackSuffix: string;

  readonly sourceCodeBucketNameCfnExportNameSuffix: string;

  readonly appAccessLogsBucketNameCfnExportNameSuffix: string;
  readonly appBucketNameCfnExportNameSuffix: string;
  readonly glsApplicationIdCfnExportNameSuffix: string;
  readonly glsStreamGroupIdCfnExportNameSuffix: string;

  readonly wafIpSetIdCfnExportNameSuffix: string;
  readonly wafAclAttrArnCfnExportNameSuffix: string;
 
  readonly cloudFrontDistributionAccessLogsBucketNameCfnExportNameSuffix: string;
  readonly websiteBucketNameCfnExportNameSuffix: string;
  readonly websiteURLCfnExportNameSuffix: string;
  readonly distributionIdCfnExportNameSuffix: string;
}

export interface IDotEnv {
  readonly 'aws_cfn_prefix': string;

  readonly 'aws_cicd_cfn_stack_suffix': string;
  readonly 'aws_backend_cfn_stack_suffix': string;
  readonly 'aws_frontend_waf_cfn_stack_suffix': string;
  readonly 'aws_frontend_cfn_stack_suffix': string;

  readonly 'aws_main_cli_profile': string;
  readonly 'aws_main_account_id': string;
  readonly 'aws_main_region': string;
  readonly 'aws_main_deploy_id': string;
  readonly 'aws_main_cdk_qualifier': string;

  readonly 'aws_cicd_source_code_bucket_name_cfn_export_name_suffix': string;

  readonly 'aws_backend_app_access_logs_bucket_name_cfn_export_name_suffix': string;
  readonly 'aws_backend_app_bucket_name_cfn_export_name_suffix': string;
  readonly 'aws_backend_gls_application_id_cfn_export_name_suffix': string;
  readonly 'aws_backend_gls_stream_group_id_cfn_export_name_suffix': string;

  readonly 'aws_frontend_waf_ip_set_id_cfn_export_name_suffix': string;
  readonly 'aws_frontend_waf_web_acl_attr_arn_cfn_export_name_suffix': string;

  readonly 'aws_frontend_cloudfront_access_logs_bucket_name_cfn_export_name_suffix': string;
  readonly 'aws_frontend_website_bucket_name_cfn_export_name_suffix': string;

  readonly 'aws_frontend_website_url_cfn_export_name_suffix': string;
  readonly 'aws_frontend_distribution_id_cfn_export_name_suffix': string;
}