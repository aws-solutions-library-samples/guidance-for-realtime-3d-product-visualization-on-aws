# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for shared makefile stuff.
.NOTPARALLEL:
.DEFAULT_GOAL: null
null: 
	@echo 'Nothing to see here.'

OS := $(shell uname -s)

ifeq ($(OS),Windows_NT) 
  SHELL := powershell
	detected_os := Windows
else
  SHELL := /bin/bash
	detected_os := $(shell sh -c 'uname 2>/dev/null || @echo Unknown')
endif