#!/bin/bash
# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for removing all AWS CloudWatch log groups and streams for a stage.
# References:
# * https://github.com/AntoOnline/bash-script-aws-cloudwatch-delete-log-groups/blob/main/delete-cw-log-groups.shhttps://github.com/AntoOnline/bash-script-aws-cloudwatch-delete-log-groups/blob/main/delete-cw-log-groups.sh
set -ex

if [ "$#" -ne 5 ]; then
  echo "Must pass aws_cfn_prefix, stage, deploy_id, region, and aws_cli_profile_arg as parameters, exiting"
  exit 1
fi

aws_cfn_prefix="$1"
stage="$2"
deploy_id="$3"
region="$4"
aws_cli_profile_arg="$5"

describe_log_groups_response=$(aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output table --region $region $aws_cli_profile_arg | awk '{print $2}' | grep -v ^$ | grep -v DescribeLogGroups | grep "$aws_cfn_prefix-$stage" | grep "$deploy_id")

for name in ${describe_log_groups_response}; do
	echo "deleting log group ${name}"
	aws logs delete-log-group --log-group-name "${name}" --region $region $aws_cli_profile_arg && echo "removed log group" || echo "failed to remove log group"
done