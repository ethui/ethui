import path from 'node:path'
import url from 'node:url'
import fs from 'node:fs/promises'

import { browser } from '@wdio/globals'
import type { Options, Capabilities } from '@wdio/types'

import pkg from './package.json' assert { type: 'json' }
import { config as baseConfig } from './wdio.conf.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const chromeExtension = (await fs.readFile(path.join(__dirname, `iron_wallet-chrome-v${pkg.version}.crx`))).toString('base64')
const firefoxExtensionPath = path.resolve(__dirname, `web-extension-firefox-v${pkg.version}.xpi`)

async function openExtensionPopup (this: WebdriverIO.Browser, extensionName: string, popupUrl = 'index.html') {
  if ((this.capabilities as Capabilities.Capabilities).browserName !== 'chrome') {
    throw new Error('This command only works with Chrome')
  }
  await this.url('chrome://extensions/')

  const extensions = await this.$$('>>> extensions-item')
  const extension = await extensions.find(async (ext) => (await ext.$('#name').getText()) === extensionName)

  if (!extension) {
    const installedExtensions = await extensions.map((ext) => ext.$('#name').getText())
    throw new Error(`Couldn't find extension "${extensionName}", available installed extensions are "${installedExtensions.join('", "')}"`)
  }

  const extId = await extension.getAttribute('id')
  await this.url(`chrome-extension://${extId}/popup/${popupUrl}`)
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace WebdriverIO {
      interface Browser {
        openExtensionPopup: typeof openExtensionPopup
      }
  }
}

export const config: Options.Testrunner = {
  ...baseConfig,
  specs: ['./e2e/**/*.e2e.ts'],
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: ['--headless=new'],
      extensions: [chromeExtension]
    }
  }, {
    browserName: 'firefox',
    'moz:firefoxOptions': {
      args: ['-headless']
    }
  }],
  before: async (capabilities) => {
    browser.addCommand('openExtensionPopup', openExtensionPopup)
    const browserName = (capabilities as Capabilities.Capabilities).browserName

    if (browserName === 'firefox') {
      const extension = await fs.readFile(firefoxExtensionPath)
      await browser.installAddOn(extension.toString('base64'), true)
    }
  }
}
