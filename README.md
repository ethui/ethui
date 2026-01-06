# ethui

[announcement]: https://mirror.xyz/ethui.eth/OnCNvwKBs6ZpJrOVQQqsqHFW1RkqEK7MAsbPSIQNRFo
[good-first-issue]: https://github.com/naps62/ethui/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[releases]: https://github.com/ethui/ethui/releases
[prank-wallet]: https://ethglobal.com/showcase/prank-wallet-cgnb3
[anvil]: https://book.getfoundry.sh/anvil/
[chrome-extension]: https://chrome.google.com/webstore/detail/ethui/eljobehkpcnpekmbcjiidekjhkbcnpkf
[firefox-extension]: https://addons.mozilla.org/en-US/firefox/addon/ethui/

<p align="center">
    <img src="https://raw.githubusercontent.com/ethui/.github/main/banner/github.png" width=70%>
</p>

<p align="center">
   <a href="https://github.com/ethui/ethui/blob/main/LICENSE">
    <img alt="licence badge" src="https://img.shields.io/github/license/ethui/ethui">
</a>
<a href="https://github.com/ethui/ethui/releases">
    <img alt="release badge" src="https://img.shields.io/github/v/release/ethui/ethui">
</a>
<a href="https://github.com/ethui/ethui/actions">
    <img alt="build badge" src="https://img.shields.io/github/actions/workflow/status/ethui/ethui/rust.yml">
</a>
</p>

## What is ethui?

An Ethereum development toolkit. [ethui](https://ethui.dev/) has the usual functionality of a crypto wallet, while also providing access to crucial features for a comfortable & fast development workflow.

### Main features

- **anvil-aware**: ethui uses a dedicated syncing process for local [anvil][anvil] nodes, enabling real-time syncing which works across chain restarts, reverts, and downtime. No longer should you have to manually reset the `nonce` in your wallet
- **foundry-aware**: the wallet finds existing `forge` outputs in your filesystem, and matches them against on-chain bytecode to create a built-in explorer akin to Etherscan's contract interaction tool;
- **multiple wallets**: ethui is not restricted to a single mnemonic. Create as many wallets as you want, and switch seamlessly between them;
- **fast mode**: when using a test wallet & an anvil node, ethui can skip security and password checks, allowing fast iteration times without compromising security;
- **Desktop-native experience**: no longer tied to a browser's sandbox. Your wallet is now reachable across your entire system, and you can even use it as a proxy for your scripting RPC needs;

## Installing

1. Check the latest [release][releases]
2. Download the appropriate binary for your architecture, and set it up in your `$PATH`
3. Install the extension for [Google Chrome][chrome-extension] or [Firefox][firefox-extension]
4. Run `ethui`.

---

## Partners

<a href="https://subvisual.com/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ethui/.github/main/partners/subvisual.png">
    <img alt="subvisual logo" src="https://raw.githubusercontent.com/ethui/.github/main/partners/subvisual.png" width="auto" height="40">
  </picture>
</a>

<a href="https://lightshift.xyz/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ethui/.github/main/partners/lightshift.png">
    <img alt="lightshift logo" src="https://raw.githubusercontent.com/ethui/.github/main/partners/lightshift.png" width="auto" height="40">
  </picture>
</a>

## Contributing

Check out the [Contribution Guide](./CONTRIBUTING.md)

## License

[MIT](./LICENSE) License
