// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining build script constants.
import * as path from 'path';

export const templateExtension: string = '.ejs';

export const pagesDir: string = path.join(process.cwd(), 'src/frontend/templates.pages');
export const frontendDistDir: string = path.join(process.cwd(), 'dist.frontend');