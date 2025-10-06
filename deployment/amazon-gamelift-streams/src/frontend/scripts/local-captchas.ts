// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for providing a local captcha generator and validator.
import * as log from 'ts-app-logger';

export class LocalCaptcha {
  private readonly inputId = new Date().getTime() + 1;
  private readonly submitButtonId = new Date().getTime();
  private readonly element: HTMLElement;
  private callbacks?: ICallbacks;
  private captchaValues?: ICaptchaValues;

  constructor(element: HTMLElement) { this.element = element; }

  renderCaptcha(callbacks: ICallbacks): void {
    this.callbacks = callbacks;

    this.captchaValues = generateCaptchaValues();

    this.element.innerHTML = `
      <div class='captcha-captcha-container'>
        <p class='captcha-captcha-text'>Please verify that you are not a robot.</p>
        <span class='captcha-captcha-value'>${this.captchaValues.value1} + ${this.captchaValues.value2} = </span>
        <input id='${this.inputId}' type='number' class='captcha-captcha-input required' required>
        <button id='${this.submitButtonId}'>I am not a robot</button>
      </div>
    `;

    const submitButton = this.element.getElementsByTagName('button')[0];
    submitButton.onclick = () => { this.onClickSubmit(); }
  }

  private onClickSubmit() {
    const userSpecifiedCaptchaValue = this.element.getElementsByTagName('input')[0].value;
    log.debug('userSpecifiedCaptchaValue', userSpecifiedCaptchaValue);

    if (!userSpecifiedCaptchaValue || userSpecifiedCaptchaValue === '') { return; }

    const isValidCaptchaValue = this.validCaptchaValue(userSpecifiedCaptchaValue);
    log.debug('isValidCaptchaValue', isValidCaptchaValue);

    // Locally we do not allow for retries.
    isValidCaptchaValue ? this.callbacks?.onSuccess() : this.callbacks?.onError(new Error('You have been detected as a bot.'));
  }

  private validCaptchaValue(userSpecifiedCaptchaValue: any): boolean {
    try {
      return Number(userSpecifiedCaptchaValue) === (this.captchaValues?.value1! + this.captchaValues?.value2!);
    } catch (error) {
      return false;
    }
  }
}

interface ICallbacks {
  onSuccess(): void;
  onError(error: any): void;
}

const generateCaptchaValues = (): ICaptchaValues => {
  const value1: number = getRandomNumber(1, 9);
  const value2: number = getRandomNumber(1, 9);
  
  return { value1, value2 };
}

interface ICaptchaValues { 
  value1: number; 
  value2: number; 
}

const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}