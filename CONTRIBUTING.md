# Contributing to ethui

[coc]: https://www.rust-lang.org/policies/code-of-conduct
[contact]: https://linktr.ee/naps62
[good-first-issue]: https://github.com/ethui/ethui/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22
[tauri-requirements]: https://tauri.app/v1/guides/getting-started/prerequisites/
[foundry]: https://getfoundry.sh/
[demo]: https://github.com/ethui/demo
[anvil]: https://book.getfoundry.sh/anvil/
[extension-repo]: https://github.com/ethui/extension

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
- **Google Chrome** or **Firefox**;
- [**Foundry**][foundry], the toolkit for Ethereum smart contract development.

### Get started

**1. Clone the repo**

```sh
git clone git@github.com:ethui/ethui && cd ethui
```

**2. Run the setup script**, which should guide you through all requirements:

```
./scripts/setup
```

**3. Install the extension**

1. Setup the extension repo
2. go to `chrome://extensions`
3. enable `Developer mode` (upper right corner)
4. Load unpacked -> choose the `<extension-repo>/dist/chrome-dev` directory

**4. Start the development environment**

```sh
pnpm run dev
```

## Code of Conduct

We adhere to the [Rust Code of Conduct][coc], which describes expected minimum behaviour we expect from all contributors. Please [contact us][contact] in case of any violations.
