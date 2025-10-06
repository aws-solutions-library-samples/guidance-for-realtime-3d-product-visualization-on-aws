// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for fixing the error: "Dynamic require of "<package>" is not supported".
// This error aries after running a Node.js program that's been esbuilt. 
// After we transpile from .ts to .js, we bundle our main .js entrypoint file, which means 
//  bringing in the .js dependencies for modules referenced - and that's done with esbuild.
// See: https://github.com/evanw/esbuild/issues/1921#issuecomment-1898197331
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';

globalThis.require = createRequire(import.meta.url);
globalThis.__filename = url.fileURLToPath(import.meta.url);
globalThis.__dirname = path.dirname(__filename);