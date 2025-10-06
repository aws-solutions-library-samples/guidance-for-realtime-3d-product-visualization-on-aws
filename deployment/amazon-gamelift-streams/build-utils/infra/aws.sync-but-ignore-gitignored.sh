#!/bin/bash
# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for syncing files needed for CICD to a bucket.
set -e

exclude_args=""
while read -r line; do
  if [[ "$line" =~ ^#.*$ ]]; then
    echo "ignore $line" # Removes comments.
  else 
    if [[ ! -z "$line" ]]; then
      exclude_args="$exclude_args --exclude '$line'"
    fi
  fi
done < ".gitignore"

exclude_args=$(echo $exclude_args | sed "s/--exclude ''//g") # Removes --exclude '' from unscrubbed newlines if there are any.
cmd="aws s3 sync ./ $1/amazon-gamelift-streams --delete --region $2 $3 $exclude_args --exclude '*.git/*'"
echo "$cmd"
eval $cmd

exclude_args=""
while read -r line; do
  if [[ "$line" =~ ^#.*$ ]]; then
    echo "ignore $line" # Removes comments.
  else 
    if [[ ! -z "$line" ]]; then
      exclude_args="$exclude_args --exclude '$line'"
    fi
  fi
done < "../placeholder-app/.gitignore"

exclude_args=$(echo $exclude_args | sed "s/--exclude ''//g") # Removes --exclude '' from unscrubbed newlines if there are any.
cmd="aws s3 sync ../placeholder-app $1/placeholder-app --delete --region $2 $3 $exclude_args --exclude '*.git/*'"
echo "$cmd"
eval $cmd