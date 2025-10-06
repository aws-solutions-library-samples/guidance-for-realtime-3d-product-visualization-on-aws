#!/bin/bash
# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for removing dashes from input.
# It's used to lookup CloudFormation export keys when they have dashes in them,
#  since CloudFormation strips them automatically.
set -e

input=$1
output="${input//-/}"
echo "$output"