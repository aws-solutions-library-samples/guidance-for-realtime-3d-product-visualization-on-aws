# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for shared makefile stuff.
.NOTPARALLEL:
.DEFAULT_GOAL: null
null: 
	@echo 'Nothing to see here.'

ifeq ($(OS),Windows_NT) 
  SHELL := powershell
	detected_os := Windows
else
  SHELL = /bin/bash
	.SHELLFLAGS := -ex -c
	detected_os := $(shell sh -c 'uname 2>/dev/null || @echo Unknown')
endif

# Include environment configuration.
ifneq (,$(wildcard ./config/.env))
	include ./config/.env
	export
endif

# Trim spaces and comments from env variables
override aws_main_deploy_id := $(strip $(firstword $(subst \#, ,$(aws_main_deploy_id))))
override aws_main_cdk_qualifier := $(strip $(firstword $(subst \#, ,$(aws_main_cdk_qualifier))))
override aws_cfn_prefix := $(strip $(firstword $(subst \#, ,$(aws_cfn_prefix))))
override aws_cdk_toolkit_cfn_stack_suffix := $(strip $(firstword $(subst \#, ,$(aws_cdk_toolkit_cfn_stack_suffix))))
override aws_cicd_cfn_stack_suffix := $(strip $(firstword $(subst \#, ,$(aws_cicd_cfn_stack_suffix))))


# See ./config/.env file for AWS stage configuration.
stage ?= main

# Use this flag to set or determine where software is running.
app_location ?= local

# Use this flag to determine if JavaScript/CSS is minified.
node_env ?= development

# Use this flag to bundle JavaScript with esbuild targeting "node" (backend) or "web" frontend.
target ?= web

# Pass Node.js target version When bundling Node.js files using esbuild.
node_target=node20

# Moved to tsx because of globalThis issue, but ts-node/esm still used to invoke CDK apps.
ts_exec_ts_node = ts-node/esm
ts_exec_tsx = tsx/esm

# Configure path variables without "./" in front since some CLI programs don't like relative paths.
frontend_dist_dir := dist.frontend
edge_dist_dir := dist.edge
app_dist_dir := ../placeholder-app/target/x86_64-unknown-linux-gnu/release