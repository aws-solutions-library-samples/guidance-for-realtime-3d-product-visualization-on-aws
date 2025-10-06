#!/bin/bash
# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for managing our AWS WAF API key.
# The API key is used to protected dynamic Amazon CloudFront URLs that have edge middleware functions which make requests to AWS services
#  on behalf of unauthenticated visitors. 
# There's not a way to do this through AWS CloudFormation w/o using a custom AWS CloudFormation resource, 
#  i.e. an AWS Lambda function, which we opted not to use.
# If you would like to do that, see: https://github.com/aws-samples/aws-waf-bot-control-api-protection-with-captcha/blob/main/lambda/custom-resource/index.js
set -ex

if [ "$#" -ne 7 ]; then
  echo "Must pass cfn_stack_prefix, stage, deploy_id, region, aws_frontend_website_url_cfn_export_name_suffix, aws_frontend_cfn_stack_suffix, and aws_cli_profile_arg as parameters, exiting"
  exit 1
fi

cfn_stack_prefix="$1"
stage="$2"
deploy_id="$3"
region="$4"
aws_frontend_website_url_cfn_export_name_suffix="$5"
aws_frontend_cfn_stack_suffix="$6"
aws_cli_profile_arg="$7"

export cfn_export_key=$(./build-utils/infra/aws.strip-dashes.sh "${cfn_stack_prefix}-${stage}-${aws_frontend_website_url_cfn_export_name_suffix}-${deploy_id}")
export app_url=$(aws cloudformation describe-stacks --stack-name "${cfn_stack_prefix}-${stage}-${aws_frontend_cfn_stack_suffix}-${deploy_id}" $aws_cli_profile_arg --region "us-east-1" --query 'Stacks[0].Outputs[?OutputKey==`'$cfn_export_key'`].OutputValue' --output text)

set +e
existing_waf_api_key=$(aws ssm get-parameter --name "/${cfn_stack_prefix}/${stage}/aws-waf-api-key/${deploy_id}" --region "$region" --query "Parameter.Value" --output text $aws_cli_profile_arg)
set -e

if [[ -z "$existing_waf_api_key" ]]; then
  waf_api_key=$(aws wafv2 create-api-key --token-domains "$app_url" --scope "CLOUDFRONT" --region "us-east-1" $aws_cli_profile_arg | jq -r '.APIKey')

  # This sample stores this AWS WAF data in AWS SSM and writes it into the HTML of our 3D product visualizer website at build time.
  aws ssm put-parameter \
    --name "/${cfn_stack_prefix}/${stage}/aws-waf-api-key/${deploy_id}" \
    --type "String" --value "${waf_api_key}" --overwrite \
    --region "$region" $aws_cli_profile_arg
fi