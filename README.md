# Iron Wallet

A DevEx focused crypto wallet.

[good-first-issue]: https://github.com/naps62/iron/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22

---

## Contributing

Pull Requests & Issues are always welcome. Please make sure your PR passes every CI check.
Search through currently open issues for suggestions on where you may be able to contribute (particularly the [`good-first-issue`][good-first-issue] label).

Read on for a concrete guide on how to get set up.

### Maybe start with the video?

[Video link][video]

### Requirements

- Node.js (16+ recommended)
- Yarn
- Google Chrome (a profile without MetaMask installed)
- [justfile][justfile]
- [watchexec][watchexec]

### Get started

Clone the repo and install dependencies

```sh
git clone git@github.com:subvisual/iron
cd iron
yarn
```

Now start the development server:

```sh
# the recommended way (see next section for why `just` is recommended over `yarn`)
just dev

# the Node.js way
yarn dev
```

1. Open Google Chrome
2. go to `chrome://extensions`
3. enable `Developer mode` (upper right corner)
4. Load unpacked -> choose the `iron/dist` directory
5. Iron should now be running

### A note on live-reloading

We use [parcel][parcel] for the build system (it has a preset suited for browser extensions). However, I've ran into problems with `parcel watch`, where it doesn't actually seem to properly recompile all of the changes.

This being a browser extension doesn't help, as that introduces additional complexity, and some of its components don't actually support live-reloading.

But regardless, I found better results with [watchexec][watchexec] instead of `parcel watch`, which is why I'm recommending it here.
The build times should be close to the same because caching still does its job.
