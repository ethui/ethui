# Iron Wallet

A DevEx focused crypto wallet.

[good-first-issue]: https://github.com/naps62/iron/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[justfile]: https://github.com/casey/just

---

## Contributing

Pull Requests & Issues are always welcome. Please make sure your PR passes every CI check.
Search through currently open issues for suggestions on where you may be able to contribute (particularly the [`good-first-issue`][good-first-issue] label).

Read on for a concrete guide on how to get set up.

### Requirements

- Rust
- Node.js (16+ recommended)
- Yarn
- Google Chrome (a profile without MetaMask installed)
- [justfile][justfile]

### Get started

Clone the repo and install dependencies

```sh
git clone git@github.com:subvisual/iron
cd iron
just setup
```

Now start the development server:

```sh
just dev
```

On the first run, you'll also need to install the development extension.

1. Open Google Chrome
2. go to `chrome://extensions`
3. enable `Developer mode` (upper right corner)
4. Load unpacked -> choose the `iron/extension/dist` directory
5. Iron should now be running

For future runs, you may jus need to reload it on `chrome://extensions`.
