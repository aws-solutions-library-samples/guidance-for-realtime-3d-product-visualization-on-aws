// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining our captcha element.
// Locally: just a simple captcha system is used.
// AWS: AWS WAF's catpcha system is used. See: https://docs.aws.amazon.com/waf/latest/developerguide/waf-js-captcha-api-render.html
import { CaptchaError } from 'AwsWafCaptcha';
import { getErrorMessage } from './status-display';
import { LocalCaptcha } from './local-captchas';
import * as comms from './comms';

export class CaptchaCaptcha extends HTMLElement {
  connectedCallback() {}

  renderCaptcha() {
    if (app_location === 'local') {
      const localCaptcha = new LocalCaptcha(this);
      localCaptcha.renderCaptcha({
        onSuccess: () => { comms.validCaptcha({}); },
        onError: (error: any) => { comms.invalidCaptcha({ errorMessage: getErrorMessage(error) }); }
      });
    } else {
      if (!aws_waf_api_key) {
        comms.invalidCaptcha({ errorMessage: 'Unable to validate you are not a robot.' });

        return;
      }

      AwsWafCaptcha.renderCaptcha(this, {
        apiKey: aws_waf_api_key,
        onSuccess: (wafToken: string) => { comms.validCaptcha({ wafToken }); },
        onError: (error: CaptchaError) => { comms.invalidCaptcha({ errorMessage: getErrorMessage(error) }); }
      });
    }
  }
}

customElements.define('captcha-captcha', CaptchaCaptcha);