#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

import { remote } from 'webdriverio'

import pkg from '../../package.json' assert { type: 'json' }

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

/**
 * start WebDriver session with extension installed
 */
async function startBrowser (browserName) {
  const capabilities = browserName === 'chrome'
    ? {
      browserName,
      'goog:chromeOptions': {
        args: [`--load-extension=${path.join(__dirname, '..', '..', 'dist')}`]
      }
    }
    : { browserName }
  const browser = await remote({
    // logLevel: 'error',
    capabilities
  })

  if (browserName === 'firefox') {
    const extension = await fs.readFile(path.join(__dirname, '..', '..', `web-extension-firefox-v${pkg.version}.xpi`))
    await browser.installAddOn(extension.toString('base64'), true)
  }

  await browser.url('https://github.com/stateful/web-extension-starter-kit')
}

const browserName = process.argv.slice(2).pop() || 'chrome'
// eslint-disable-next-line no-console
console.log(`Run web extension in ${browserName}...`)
await startBrowser(browserName)
