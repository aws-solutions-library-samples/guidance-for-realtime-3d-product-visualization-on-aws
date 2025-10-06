#! node
// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for compiling EJS templates to HTML.
import * as log from 'ts-app-logger';
log.configure({ traceEnabled: true, debugEnabled: true, infoEnabled: true, warningEnabled: true, errorEnabled: true, filters: [] });

import * as fs from 'node:fs';
import * as path from 'node:path';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ejs = require('ejs');

import { argparser } from './build-html.argparser';

import * as constants from './constants';
import * as iface from './iface';
import { generateScriptCspHashes } from './build-script-hashes';

const compileToHTML = (
  initialTemplateData: iface.IInitialTemplateData
): Array<iface.IHTMLTemplate> => {
  log.trace('compileToHTML', initialTemplateData);

  const htmlTemplates: Array<iface.IHTMLTemplate> = [];

  addStaticPageHTMLTemplates(constants.pagesDir, htmlTemplates);

  return htmlTemplates.map((htmlTemplate: iface.IHTMLTemplate) => {
    const html = compileHTMLTemplate(
      initialTemplateData, 
      htmlTemplate
    );

    log.debug(`saving compiled ${htmlTemplate.path} to ${htmlTemplate.htmlPath}`);
    
    fs.writeFileSync(htmlTemplate.htmlPath!, html);

    return htmlTemplate;
  });
};

const addStaticPageHTMLTemplates = (dir: string, htmlTemplates: Array<iface.IHTMLTemplate>) => {
  log.trace('addStaticPageHTMLTemplates', dir, htmlTemplates);

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const childPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      addStaticPageHTMLTemplates(childPath, htmlTemplates);

      continue;
    }

    if (!isPageTemplate(path, childPath)) {
      log.warn('not ejs template, ignoring');

      continue;
    }

    const templateFolder = dir.split('/').slice(-1)[0];
    log.debug('templateFolder', templateFolder, 'entry.name', entry.name);

    const templatePath = path.join(dir, entry.name);
    log.debug(`adding page html template: ${templatePath}`);
    
    htmlTemplates.push(getPageHTMLTemplate(templatePath, entry.name));
  }
};

const isPageTemplate = (path: any, childPath: string): boolean => {
  if (path.extname(childPath) === constants.templateExtension) {
    return true;
  }

  return false;
}

const getPageHTMLTemplate = (templatePath: string, templateName: string): iface.IHTMLTemplate => {
  log.trace('getPageHTMLTemplate', templatePath, templateName);

  const htmlPath = `${constants.frontendDistDir}/${templateName}`.replace(constants.templateExtension, '.html');

  return { name: templateName, path: templatePath, htmlPath };
};

const compileHTMLTemplate = (
  initialTemplateData: iface.IInitialTemplateData,
  htmlTemplate: iface.IHTMLTemplate
) => {
  log.debug(`compiling page html template ${htmlTemplate.path}`);

  const templateString = fs.readFileSync(`${htmlTemplate.path}`, 'utf-8');
  
  const templateData: iface.IHTMLTemplateData = {
    locals: {},
    app_stage: initialTemplateData.appStage,
    app_location: initialTemplateData.appLocation,
    scripts_with_csp_hashes: initialTemplateData.scripts_with_csp_hashes,
    aws_waf_api_key: initialTemplateData.aws_waf_api_key,
    aws_waf_captcha_integration_url: initialTemplateData.aws_waf_captcha_integration_url
  };

  log.debug('templateString', templateString, 'templateData', templateData);

  const html = ejs.render(templateString, templateData);

  return html;
};

const appStage = argparser.args.stage as iface.TAppStage;
const appLocation = argparser.args['app-location'] as iface.TAppLocation;
const aws_waf_api_key = argparser.args['aws-waf-api-key'] as string | undefined;
const aws_waf_captcha_integration_url = argparser.args['aws-waf-captcha-integration-url'] as string | undefined;

compileToHTML({ 
  appStage,
  appLocation,
  scripts_with_csp_hashes: await generateScriptCspHashes(appLocation),
  aws_waf_api_key,
  aws_waf_captcha_integration_url
});