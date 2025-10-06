#! node
// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file generates HTML that ultimately gets injected into our index.html ejs template.
// The generated HTML has script/link references to our application's JavaScripts, along with each's hashes. 
// See: https://content-security-policy.com/hash/
import * as path from 'path';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

import * as iface from './iface';

const scriptsToHash: Record<string, string> = {
  '/gameliftstreams-1.0.0.js': 'script',
  '/bundle.frontend.js': 'script',
};

export const generateScriptCspHashes = async (appLocation: iface.TAppLocation): Promise<string> => {
  const hashesByScriptName: Record<string, string> = {}

  let templateHTML = '';
  for (const scriptName in scriptsToHash) {
    const hash = await generateHashForScript(scriptName);

    hashesByScriptName[scriptName] = hash;

    if (appLocation === 'aws') {
      if (scriptsToHash[scriptName] === 'script') {
        templateHTML += `<script defer src='${scriptName}' integrity='sha256-${hash}'></script>\r\n`;
      } else {
        templateHTML += `<link href='${scriptName}' integrity='sha256-${hash}' rel='preload' as='script'>\r\n`;
      }
    } else {
      // Not using HTTPs so not including integrity check. See: https://stackoverflow.com/questions/50523151/firefox-none-of-the-sha256-hashes-in-the-integrity-attribute-match-the-conte
      if (scriptsToHash[scriptName] === 'script') {
        templateHTML += `<script defer src='${scriptName}'></script>\r\n`;
      } else {
        templateHTML += `<link href='${scriptName}' rel='preload' as='script'>\r\n`;
      }
    }
  }

  return templateHTML;
}

const generateHashForScript = async (scriptName: string): Promise<string> => {
  return new Promise((resolve) => {
    const hash = createHash('sha256');

    const input = createReadStream(path.resolve(process.cwd(), `./dist.frontend/${scriptName}`));
    input.on('readable', () => {
      const data = input.read();

      if (!data) { return resolve(hash.digest('base64')); }
      
      hash.update(data);
    });
  });
}