#!/bin/bash
# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for self-mutating our CICD pipeline.
set -ex

if [ "$#" -ne 12 ]; then
  echo "Must pass all the args as parameters, exiting"
  exit 1
fi

cdk_action="$1" 
aws_cfn_prefix="$2"
stage="$3"
deploy_id="$4"
aws_frontend_cfn_stack_suffix="$5"
aws_backend_cfn_stack_suffix="$6"
region="$7"
cfn_export_key_1="$8"
cfn_export_key_2="$9"
cfn_export_key_3="${10}"
cfn_export_key_4="${11}"
aws_cli_profile_arg="${12}"

echo "lookup cfn export: ${cfn_export_key_1}"
website_bucket_name=$(aws cloudformation describe-stacks --stack-name "${aws_cfn_prefix}-${stage}-${aws_frontend_cfn_stack_suffix}-${deploy_id}" ${aws_cli_profile_arg} --region "us-east-1" --query 'Stacks[0].Outputs[?OutputKey==`'${cfn_export_key_1}'`].OutputValue' --output text)
echo "found cfn export website_bucket_name: $website_bucket_name"

echo "lookup cfn export: ${cfn_export_key_2}"
app_url=$(aws cloudformation describe-stacks --stack-name "${aws_cfn_prefix}-${stage}-${aws_frontend_cfn_stack_suffix}-${deploy_id}" ${aws_cli_profile_arg} --region "us-east-1" --query 'Stacks[0].Outputs[?OutputKey==`'${cfn_export_key_2}'`].OutputValue' --output text)
echo "found cfn export app_url: $app_url"

echo "lookup cfn export: ${cfn_export_key_3}"
distribution_id=$(aws cloudformation describe-stacks --stack-name "${aws_cfn_prefix}-${stage}-${aws_frontend_cfn_stack_suffix}-${deploy_id}" ${aws_cli_profile_arg} --region "us-east-1" --query 'Stacks[0].Outputs[?OutputKey==`'${cfn_export_key_3}'`].OutputValue' --output text)
echo "found cfn export distribution_id: $distribution_id"

echo "lookup cfn export: ${cfn_export_key_4}"
app_bucket_name=$(aws cloudformation describe-stacks --stack-name "${aws_cfn_prefix}-${stage}-${aws_backend_cfn_stack_suffix}-${deploy_id}" ${aws_cli_profile_arg} --region "$region" --query 'Stacks[0].Outputs[?OutputKey==`'${cfn_export_key_4}'`].OutputValue' --output text)
echo "found cfn export app_bucket_name: $app_bucket_name"

make -f makefile.aws \
  cdk_action="$cdk_action" \
  stage="$stage" \
  self_mutate_pipeline=true \
  website_bucket_name="$website_bucket_name" \
  app_bucket_name="$app_bucket_name" \
  app_url="$app_url" \
  distribution_id="$distribution_id" \
  deploy/cicd
