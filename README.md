# Iron Wallet

[good-first-issue]: https://github.com/naps62/iron/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[justfile]: https://github.com/casey/just
[releases]: https://github.com/iron-wallet/iron/releases

A developer's crypto wallet.

![Iron wallet](./screenshot.png)

## Features / Roadmap

- [x] **Metamask drop-in replacement for simple flows**
  - "Connect with MetaMask", submit transactions, sign messages, switch accounts & networks without intrusive popups
- [x] **[anvil]-aware**
  - [x] track transaction history
  - [x] track deployed smart contracts (via traces, so internal deploys are also detected)
  - [x] automatically track chain restarts / reverts
- [ ] connection list
  - [ ] fine-grained control over account and network selection (i.e. different selections per tab, or per domain)
  - [ ] track local foundry projects, sync ABIs and deploys
  - [ ] etherscan-like contract read/write UI for all local contracts
  - [ ] fork & simulate mainnet transactions locally. for debugging & security
  - [ ] impersonate / prank on any dApp

## Security

**Right now there is none.**
Our "go to market strategy" is to help developers looking to speed up their feedback loop. This means:

- mnemonic defaults to `test test test ... junk`
- no encryption, no passwords to input all the time. just a plain HD Wallet
- no annoying popups for confirmations, gas estimates, etc (they'll come, but opt-in)
- no need to "Reset your Account" to reset the `nonce`

This will change soon, but we're debating ideas on how this could also be done better, such as:

- Allow connection to private keys in 3rd party encryption software (GPG, KeyPass, ...)
- Support multiple wallets
- Retain a dev-only wallet where security would still be opted-out of

---

## Installing

1. Check the latest [release][releases]
2. Download `extension.zip` and manually install it in your browser (currently tested on Google Chrome, more to come soon):
   2.1. Extract the zip file
   2.2. go to `chrome://extensions`
   2.3. enable `Developer mode` (upper right corner)
   2.4. Load unpacked -> choose the directory you extracted from the ZIP file
3. Download the appropriate binary for your architecture, and set it up in your `$PATH`
4. Run `iron`.

---

## Contributing

Pull Requests & Issues are more than welcome! If you have a bug to report, or a feature to suggest, please open an issue.
Search through currently open issues for suggestions on where you may be able to contribute (particularly the [`good-first-issue`][good-first-issue] label).

Read on for a concrete guide on how to get set up.

### Requirements

- Rust
- Node.js (16+ recommended)
- Yarn
- Google Chrome (a profile without MetaMask installed)

There's also an optional [justfile][justfile], if you prefer that over `yarn`.

### Get started

**1. Clone the repo and install dependencies:**

```sh
git clone git@github.com:subvisual/iron && cd iron
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
