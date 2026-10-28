#!/usr/bin/env node
/**
 * Produces a dependency-free Playwright browser-control SDK.
 *
 * The output intentionally has no application npm dependencies. Node.js core
 * modules and a browser executable remain runtime requirements.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const core = path.join(root, 'packages', 'playwright-core');
const outdir = path.join(core, 'lib', 'sdk');
const packageJSON = JSON.parse(fs.readFileSync(path.join(core, 'package.json'), 'utf8'));

async function main() {
  fs.rmSync(outdir, { recursive: true, force: true });
  fs.mkdirSync(outdir, { recursive: true });

  const outfile = path.join(outdir, 'playwright.cjs');
  const result = await esbuild.build({
    entryPoints: [path.join(core, 'src', 'sdk.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    sourcemap: false,
    metafile: true,
    logOverride: { 'direct-eval': 'silent' },
    banner: {
      js: `globalThis.__PLAYWRIGHT_SDK_METADATA__ = ${JSON.stringify({ name: 'playwright-browser-sdk', version: packageJSON.version })};`,
    },
    // These integrations are optional and need their native/third-party host.
    // They do not affect Chromium, Firefox or WebKit browser automation.
    external: ['electron', 'electron/*', 'chromium-bidi', 'chromium-bidi/*'],
  });

  const externals = new Set();
  for (const output of Object.values(result.metafile.outputs)) {
    for (const input of Object.values(output.inputs)) {
      for (const item of input.imports || []) {
        if (item.external) {
          externals.add(item.path);
        }
      }
    }
  }
  const allowed = /^(?:node:|assert$|buffer$|child_process$|cluster$|console$|constants$|crypto$|dgram$|diagnostics_channel$|dns$|domain$|events$|fs$|http$|http2$|https$|module$|net$|os$|path$|perf_hooks$|process$|punycode$|querystring$|readline$|repl$|stream$|string_decoder$|sys$|timers$|tls$|trace_events$|tty$|url$|util$|v8$|vm$|wasi$|worker_threads$|zlib$|electron(?:\/.*)?$|chromium-bidi(?:\/.*)?$)/;
  const unsupported = [...externals].filter(specifier => !allowed.test(specifier));
  if (unsupported.length) {
    throw new Error(`SDK has non-static external imports: ${unsupported.join(', ')}`);
  }

  const cjs = fs.readFileSync(outfile, 'utf8');
  // esbuild puts original source paths in comments. They are not runtime
  // dependencies; reject only an actual require of a node_modules path.
  if (/\brequire\(["'][^"']*node_modules\//.test(cjs)) {
    throw new Error('SDK output contains a runtime node_modules path.');
  }

  fs.writeFileSync(path.join(outdir, 'playwright.mjs'), `import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);\nconst playwright = require('./playwright.cjs');\nexport const { chromium, firefox, webkit, selectors, devices, errors, request, _electron, _android } = playwright;\nexport default playwright;\n`);
  fs.writeFileSync(path.join(outdir, 'README.md'), `# Playwright browser SDK\n\nUse \`playwright.cjs\` from CommonJS or \`playwright.mjs\` from ESM. No application \`node_modules\` are required at runtime. Node.js 20+ and a browser executable are required. Provide \`executablePath\` when Playwright-managed browsers are not installed.\n\n\`electron\` and Chromium's experimental BiDi mapper remain host-provided optional integrations.\n`);
  console.log(`Built standalone SDK: ${path.relative(root, outdir)}`);
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
