import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const playwright = require('./playwright.cjs');
export const { chromium, firefox, webkit, selectors, devices, errors, request, _electron, _android } = playwright;
export default playwright;
