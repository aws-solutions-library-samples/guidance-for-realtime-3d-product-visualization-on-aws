// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining build script interfaces and types.
export type TAppStage = 'local' | 'main';
export type TAppLocation = 'local' | 'aws';

export interface IHTMLTemplate {
  name: string;
  path: string;
  htmlPath?: string;
  id?: ATemplateId;
}

abstract class ATemplateId {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  toString() {
    return this.id;
  }
}

export interface IInitialTemplateData { 
  appStage: TAppStage, 
  appLocation: TAppLocation; 
  scripts_with_csp_hashes: string; 
  aws_waf_api_key?: string;
  aws_waf_captcha_integration_url?: string;
};

export interface IHTMLTemplateData {
  locals: any;
  app_stage: TAppStage;
  app_location: TAppLocation;
  scripts_with_csp_hashes: string;
  aws_waf_api_key?: string;
  aws_waf_captcha_integration_url?: string;
}