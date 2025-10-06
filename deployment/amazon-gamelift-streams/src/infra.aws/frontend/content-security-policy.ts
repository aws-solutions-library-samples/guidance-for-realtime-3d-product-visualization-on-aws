// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for providing a content security policy used for any HTTP serving. 
import _globalThis from '../../@types/global-this';

export const getContentSecurityPolicy = (urls: string[]): string => {
  const contentSecurityPolicy = [
    //'trusted-types "none"',
    `base-uri 'self'${urlString(urls, false)}`,
    "default-src 'none'",
    `script-src 'self'${urlString(urls)}'unsafe-eval' 'unsafe-inline' https:`, 
    "require-trusted-types-for 'script'",
    `style-src 'self'${urlString(urls)}'unsafe-inline' https:`,
    `img-src 'self'${urlString(urls)}data: blob:`,
    `font-src 'self'${urlString(urls)}data:`,
    `connect-src 'self'${urlString(urls)}blob: ws:`,
    `worker-src 'self'${urlString(urls)}}blob:`,
    `form-action 'self'${urlString(urls, false)}`,
    "object-src 'self' data: blob:",
    "frame-ancestors 'self' blob:",
    "frame-src https:",
    "media-src https:",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    `manifest-src 'self'${urlString(urls, false)}`
  ].join('; ');

  return contentSecurityPolicy;
}

const urlString = (urls: string[], followingStatement: boolean = true) => {
  return urls.length === 0 ? (followingStatement ? ' ' : '') : ` ${urls.join(' ')}` + (followingStatement ? ' ' : '');
}