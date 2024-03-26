# Contributing to ethui

[coc]: https://www.rust-lang.org/policies/code-of-conduct
[contact]: https://linktr.ee/naps62
[good-first-issue]: https://github.com/ethui/ethui/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22
[tauri-requirements]: https://tauri.app/v1/guides/getting-started/prerequisites/
[libsodium-macos]: https://formulae.brew.sh/formula/libsodium
[libsodium-arch]: https://archlinux.org/packages/extra/x86_64/libsodium/
[libsodium-ubuntu]: https://packages.ubuntu.com/search?keywords=libsodium-dev
[foundry]: https://getfoundry.sh/
[web3-demo]: https://github.com/ethui/web3-demo
[anvil]: https://book.getfoundry.sh/anvil/

We welcome all kinds of contributions:

- Issues suggesting new features or bug reports
- Pull requests
- Newcomers to web3 / blockchain looking to learn and perhaps help along the way.

You can also [chat with us directly][contact] for questions and feedback

## But how?

Here's a few suggestions on how to get started:

1. Download and run the project yourself. Use it with your existing projects. Report back feedback and features you'd like to see.
2. Provide context or ideas for existing documented features. Anything we're missing, or any concrete suggestion for how to tackle a feature?
3. Resolving issues. Perhaps the [`good-first-issue`][good-first-issue] label is a good place to start.

## Building from source

### Requirements

- [**Tauri's requirements**][tauri-requirements];
- **libsodium** ([macos][libsodium-macos], [Arch][libsodium-arch], [Ubuntu][libsodium-ubuntu])
- **Google Chrome**, running a profile without MetaMask or other wallet installed, to be solved once EIP-6963 is widely adopted
- (optional) [**justfile**][Justfile], a simple task runner
- (optional) [**Foundry**][foundry], the toolkit for Ethereum development. You'll want this to run [anvil][anvil] nodes locally to point to wallet to
- (optional) [**Our own web3-demo app**][web3-demo], to have some basic setup to test various transactions with

### Get started

**1. Clone the repo and install dependencies:**

```sh
git clone git@github.com:ethui/ethui && cd ethui
```

**2. Run the initial build**, which will install dependencies and build the extension `dist`:

```sh
yarn setup
```

**3. Install the extension**

1. Open Google Chrome
2. go to `chrome://extensions`
3. enable `Developer mode` (upper right corner)
4. Load unpacked -> choose the `ethui/extension/dist` directory
5. ethui should now be running

**4. Start the app in development mode**

```sh
yarn app:dev
```

**Note:** If you change the extension' code, you may also need to use `yarn ext:dev`, and to manually reload it on `chrome://extensions`. Live code reloading is tricky with these.

## Code of Conduct

We adhere to the [Rust Code of Conduct][coc], which describes expected minimum behaviour we expect from all contributors. Please [contact us][contact] in case of any violations.
