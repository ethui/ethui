# ethui

[announcement]: https://mirror.xyz/ethui.eth/OnCNvwKBs6ZpJrOVQQqsqHFW1RkqEK7MAsbPSIQNRFo
[good-first-issue]: https://github.com/naps62/ethui/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[justfile]: https://github.com/casey/just
[releases]: https://github.com/ethui/ethui/releases
[prank-wallet]: https://ethglobal.com/showcase/prank-wallet-cgnb3
[anvil]: https://book.getfoundry.sh/anvil/

<p align="center">
    <img src="https://raw.githubusercontent.com/ethui/.github/main/banner/github.png" width=70%>
</>

<p align="center">
    <img alt="licence badge" src="https://img.shields.io/github/license/ethui/ethui">
    <img alt="release badge" src="https://img.shields.io/github/v/release/ethui/ethui">
    <img alt="build badge" src="https://img.shields.io/github/actions/workflow/status/ethui/ethui/rust.yml">
</>

## What is ethui?

A developer's crypto wallet. ethui has the usual functionality of a crypto wallet, as well as additional built-in tooling meant to speed up your development workflows.

### Main features

- **anvil-aware**: ethui uses a dedicated syncing process for local [anvil][anvil] nodes, enabling real-time syncing which works across chain restarts, reverts, and downtime. No longer should you have to manually reset the `nonce` in your wallet
- **foundry-aware**: the wallet finds existing `forge` outputs in your filesystem, and matches them against on-chain bytecode to create a built-in explorer akin to Etherscan's contract interaction tool
- **multiple wallets**: ethui is not restricted to a single mnemonic. Create as many wallets as you want, and switch seamlessly between them
- **Desktop-native experience**: no longer tied to a browser's sandbox. Your wallet is now reachable across your entire system, and you can even use it as a proxy for your scripting RPC needs
- **quick keyboard-based navigation**: A command bar reachable via `Cmd+K` / `Ctrl+K` provides quick access to all of the major actions

## Status

ethui is in active development, but the existing features are more than to provide an enhanced developer experience over consumer-facing wallets.

## Installing

1. Check the latest [release][releases]
2. Download the appropriate binary for your architecture, and set it up in your `$PATH`
3. Download `extension.zip` and manually install it in your browser (currently tested on Google Chrome, more to come soon):
   3.1. Extract the zip file
   3.2. go to `chrome://extensions`
   3.3. enable `Developer mode` (upper right corner)
   3.4. Load unpacked -> choose the directory you extracted from the ZIP file
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
