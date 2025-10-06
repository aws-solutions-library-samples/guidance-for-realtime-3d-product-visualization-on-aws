// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for declaring types for any JavaScript packages.

// See: https://docs.aws.amazon.com/waf/latest/developerguide/waf-js-captcha-api-specification.html
declare module 'AwsWafCaptcha' {
  export interface Configuration {
    apiKey: string;
    onSuccess(wafToken: string): void;
    onError?(error: CaptchaError): void;
    onLoad?(): void;
    onPuzzleTimeout?(): void;
    onPuzzleCorrect?(): void;
    onPuzzleIncorrect?(): void;
    defaultLocale?: string;
    disableLanguageSelector?: boolean;
    dynamicWidth?: boolean ;
    skipTitle?: boolean;
  }

  export interface CaptchaError extends Error {
    kind: 'internal_error' | 'network_error' | 'token_error' | 'client_error';
    statusCode?: number;
  }

  export interface AwsWafCaptcha {
    container: HTMLElement;
    configuration: Configuration;
  }
}

// See: https://docs.aws.amazon.com/waf/latest/developerguide/waf-js-challenge-api-specification.html
declare module 'AwsWafIntegration' {
  export interface AwsWafIntegration {
    fetch(): window.fetch;
    getToken(): Promise<string>;
    hasToken(): boolean;
  }
}