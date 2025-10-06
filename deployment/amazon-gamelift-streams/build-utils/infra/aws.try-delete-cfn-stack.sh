#!/bin/bash
# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for deleting an AWS CloudFormation stack (and waiting for it to delete).
set -ex

if [ "$#" -lt 6 ]; then
  echo "Must pass aws_cfn_prefix, stage, cfn_stack_suffix, deploy_id, region, and aws_cli_profile_arg as parameters (and optionally optional_unique_suffix), exiting"
  exit 1
fi

aws_cfn_prefix="$1"
stage="$2"
cfn_stack_suffix="$3"
deploy_id="$4"
region="$5"
aws_cli_profile_arg="$6"
optional_unique_suffix="$7" # Used with stacks like developer workstations.

aws cloudformation delete-stack \
  $aws_cli_profile_arg \
  --stack-name "${aws_cfn_prefix}-${stage}-${cfn_stack_suffix}-${deploy_id}${optional_unique_suffix}" \
  --region "$region"

aws cloudformation wait stack-delete-complete \
  $aws_cli_profile_arg \
  --stack-name "${aws_cfn_prefix}-${stage}-${cfn_stack_suffix}-${deploy_id}${optional_unique_suffix}" \
  --region "$region"