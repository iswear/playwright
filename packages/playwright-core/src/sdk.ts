/**
 * Standalone browser-automation SDK entry point.
 *
 * Deliberately exports only Playwright's browser-control API. Test runner,
 * reporters and command-line installation commands are not part of this SDK.
 */
import './bootstrap';
import { playwright } from './inprocess';

export const chromium = playwright.chromium;
export const firefox = playwright.firefox;
export const webkit = playwright.webkit;
export const selectors = playwright.selectors;
export const devices = playwright.devices;
export const errors = playwright.errors;
export const request = playwright.request;
export const _electron = playwright._electron;
export const _android = playwright._android;

export default playwright;
