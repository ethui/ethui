# Iron Wallet

[announcement]: https://mirror.xyz/iron-wallet.eth/OnCNvwKBs6ZpJrOVQQqsqHFW1RkqEK7MAsbPSIQNRFo
[good-first-issue]: https://github.com/naps62/iron/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[justfile]: https://github.com/casey/just
[releases]: https://github.com/iron-wallet/iron/releases
[prank-wallet]: https://ethglobal.com/showcase/prank-wallet-cgnb3
[anvil]: https://book.getfoundry.sh/anvil/
[tauri-requirements]: https://tauri.app/v1/guides/getting-started/prerequisites/
[libsodium-macos]: https://formulae.brew.sh/formula/libsodium
[libsodium-arch]: https://archlinux.org/packages/extra/x86_64/libsodium/
[libsodium-ubuntu]: https://packages.ubuntu.com/search?keywords=libsodium-dev

<p align="center">
    <img src="https://raw.githubusercontent.com/iron-wallet/.github/main/profile/banner.png" width=70%>
</>

## What is Iron?

A developer's crypto wallet. Iron has the usual functionality of a crypto wallet, but is purposefully built to speed up your development workflows.

### Main features

- **anvil-aware**: iron uses a dedicated syncing process for local anvil nodes, enabling real-time syncing which works across chain restarts, reverts, and downtime. No longer should you have to manually reset the `nonce` in your wallet
- **foundry-aware**: the wallet finds existing `forge` outputs in your filesystem, and matches them against on-chain bytecode to create a built-in explorer akin to Etherscan's contract interaction tool
- **multiple wallets**: Iron is not restricted to a single mnemonic. Create as many wallets as you want, and switch seamlessly between them
- **Desktop-native experience**: no longer tied to a browser's sandbox. Your wallet is now reachable across your entire system, and you can even use as a proxing for your scripting RPC needs
- **quick keyboard-based navigation**: A command bar reachable via `Cmd+K` / `Ctrl+K` provides quick access to all of the major actions

## Status

Iron is in active development, but the existing features are more than to provide an enhanced developer exprience over consumer-facing wallets.

## Installing

1. Check the latest [release][releases]
2. Download the appropriate binary for your architecture, and set it up in your `$PATH`
3. Download `extension.zip` and manually install it in your browser (currently tested on Google Chrome, more to come soon):
   3.1. Extract the zip file
   3.2. go to `chrome://extensions`
   3.3. enable `Developer mode` (upper right corner)
   3.4. Load unpacked -> choose the directory you extracted from the ZIP file
4. Run `iron`.

---

## Contributing

Check out the [Contribution Guide](./CONTRIBUTING.md)

## Building from source

### Requirements

- [**Tauri's requirements**][tauri-requirements];
- **libsodium** ([macos][libsodium-macos], [Arch][libsodium-arch], [Ubuntu][libsodium-ubuntu])
- **Google Chrome**, running a profile without MetaMask or other wallet installed, to be solved once EIP-6963 is widely adopted
- (optional) [**justfile**][Justfile]

### Get started

**1. Clone the repo and install dependencies:**

```sh
git clone git@github.com:iron-wallet/iron && cd iron
```

**2. Run the initial build**, which will install dependencies and build the extension `dist`:

```sh
yarn setup
```

**3. Install the extension**

1. Open Google Chrome
2. go to `chrome://extensions`
3. enable `Developer mode` (upper right corner)
4. Load unpacked -> choose the `iron/extension/dist` directory
5. Iron should now be running

**4. Start the app in development mode**

```sh
yarn app:dev
```

**Note:** If you change the extension' code, you may also need to use `yarn extension:dev`, and to manually reload it on `chrome://extensions`. Live code reloading is tricky with these.
