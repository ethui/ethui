# My Web Extension

> This is a starter kit for building cross platform browser extensions. You can use it as a template for your project. It comes with a [Vite](https://vitejs.dev/) + [TailwindCSS](https://tailwindcss.com/) + [WebdriverIO](https://webdriver.io) setup for building and testing extension popup modals, content and background scripts. Read more about building cross platform browser extensions in our [corresponding blog post](https://stateful.com/blog/building-cross-browser-web-extensions).

A browser web extension that works on Chrome, Firefox and Safari. Download the extension on the marketplaces:

- Chrome:: https://chrome.google.com/webstore/detail/my-web-extension/lnihnbkolojkaehnkdmpliededkfebkk
- Firefox: https://addons.mozilla.org/en-GB/firefox/addon/my-web-extension/
- Safari: _(not yet supported, see [`stateful/web-extension-starter-kit#1`](https://github.com/stateful/web-extension-starter-kit/issues/1))_

## Development
### Setup

Install dependencies via:

```sh
npm install
```

then start a browser with the web extension installed:

```sh
# run Chrome
npm run start:chrome
```

or

```sh
# run Firefox
npm run start:firefox
```

This will build the extension and start a browser with it being loaded in it. After making changes, Vite automatically will re-compile the files and you can reload the extension to apply them in the browser.

### Build

Bundle the extension by running:

```sh
npm run build
```

This script will bundle the extension as `web-extension-chrome-vX.X.X.crx` and `web-extension-firefox-vX.X.X.zip`. The generated files are in `dist/`. You can also grab a version from the [latest test](https://github.com/stateful/web-extension-starter-kit/actions/workflows/test.yml) run on the `main` branch.

#### Load in Firefox

To load the extension in Firefox go to `about:debugging#/runtime/this-firefox` or `Firefox > Preferences > Extensions & Themes > Debug Add-ons > Load Temporary Add-on...`. Here locate the `dist/` directory and open `manifestv2.json`

#### Load in Chrome

To load the extensions in Google Chrome go to `chrome://extensions/` and click `Load unpacked`. Locate the dist directory and select `manifest.json`.

### Test

This project tests the extension files using component tests and the extension integration via e2e test with WebdriverIO.

Run unit/component tests:

```sh
npm run test:component
```

Run e2e tests:

```sh
npm run test:e2e
```

## Files:

 - content-script - UI files
 - background.ts - Background script/Service worker
 - index.html - popup UI

If you have any questions feel free to open an issue.
