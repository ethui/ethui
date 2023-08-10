# Iron Wallet extension

[original]: https://github.com/stateful/web-extension-starter-kit/tree/20266f1ca8ddbfe63e5d830dd846937a233a6abe
[safari-issue]: https://github.com/stateful/web-extension-starter-kit/issues/1

The extension works on Chrome and Firefox. Safari not yet supported ([see this issue][safari-issue])

## Development

This setup is adapted from [this starter kit][original]

### Setup

Install dependencies via:

```sh
yarn install
```

then start a browser with the web extension installed:

```sh
# run Chrome
yarn run start:chrome
```

or

```sh
# run Firefox
yarn run start:firefox
```

This will build the extension and start a browser with it already loaded. After making changes, Vite automatically will re-compile the files and you can reload the extension to apply them in the browser.

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
