import * as Comlink from "comlink";
import {
  createBackgroundEndpoint,
  isMessagePort,
} from "comlink-extension/src/index";
import { Runtime } from "webextension-polyfill";

import { deriveAddress } from "./addresses";
import { State, defaults } from "./schema";

export function setupStateServer(port: Runtime.Port) {
  if (isMessagePort(port)) return;

  Comlink.expose(state, createBackgroundEndpoint(port));
}

const state: State = {
  ...defaults,
  setWalletSettings(settings) {
    this.wallet = settings;
  },
  getAll() {
    return { wallet: this.wallet, network: this.network };
  },
  setNetworks(networks) {
    this.network.networks = networks;
  },
  setCurrentNetwork(idx) {
    this.network.current = idx;
  },
  getAddress() {
    return deriveAddress(
      this.wallet.mnemonic,
      this.wallet.derivationPath,
      this.wallet.addressIndex
    );
  },
};
