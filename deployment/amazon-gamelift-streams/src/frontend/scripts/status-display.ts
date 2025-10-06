// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for defining our status dislay element.
// This element communicates "messages" to visitors.
// These communications are messages like:
// * toggling visibility of loading UI when loading a stream session
// * displaying error messages for any reason
export class StatusDisplay extends HTMLElement {
  status: SimplifiedVisitorStatus = SimplifiedVisitorStatus.HIDE;
  message?: string = 'nunya';

  connectedCallback() {}

  update(status: SimplifiedVisitorStatus, message?: string) {
    this.status = status;
    this.message = message ? message : '';

    this.render();
  }

  render() {
    if (this.status === SimplifiedVisitorStatus.LOADING) {
      this.innerHTML = `<span id='loading' class='loader'></span>`;

      return;
    }

    if (this.status === SimplifiedVisitorStatus.ERROR) {
      this.innerHTML = `<div class='error-message'>${this.message || 'Error!'}</div>`;

      return;
    }
    
    this.innerHTML = `<div></div>`; // Render nothing.
  }
}

export enum SimplifiedVisitorStatus {
  HIDE,
  LOADING,
  ERROR
}

export const getErrorMessage = (error?: any): string => {
  if (!error) { return defaultErrorMessage; }
  
  return (error as Error).message ? `Product visualizer failed. Please contact the IT administrator of this website and tell them it's because: ${(error as Error).message}` : defaultErrorMessage;
}

const defaultErrorMessage = 'Product visualizer failed. Please contact the IT administrator of this website.';

customElements.define('status-display', StatusDisplay);