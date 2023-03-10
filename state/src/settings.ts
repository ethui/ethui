import { ethers } from "ethers";
import { Runtime } from "webextension-polyfill";

import { deriveAddress, deriveAddressFromNode } from "./addresses";
import { read, write } from "./browserStorageBackend";
import { State, defaults } from "./schema";

export const listeners: Map<string, Runtime.Port> = new Map();

let hdNode: ethers.utils.HDNode;

export const settings: State & { initialized: boolean } = {
  initialized: false,

  ...defaults,

  setWalletSettings(settings) {
    // update hdNode if needed
    if (settings.mnemonic !== this.wallet.mnemonic) {
      hdNode = ethers.utils.HDNode.fromMnemonic(settings.mnemonic);
    }

    const address = deriveAddressFromNode(
      hdNode,
      settings.derivationPath,
      settings.addressIndex
    );
    this.wallet = { address, ...settings };
    broadcast();
    write("wallets", this.wallet);
  },

  getAll() {
    return { wallet: this.wallet, network: this.network };
  },

  setNetworks(networks) {
    console.log("setNetworks", networks);
    this.network.networks = networks;
    broadcast();
    write("networks", this.network);
  },

  setCurrentNetwork(idx) {
    this.network.current = idx;
    broadcast();
    write("networks", this.network);
  },

  getAddress() {
    return deriveAddress(
      this.wallet.mnemonic,
      this.wallet.derivationPath,
      this.wallet.addressIndex
    );
  },
};

export async function initState() {
  settings.wallet = await read("wallet", defaults.wallet);
  settings.network = await read("network", defaults.network);
  settings.initialized = true;
  hdNode = ethers.utils.HDNode.fromMnemonic(settings.wallet.mnemonic);
}

// ping all polling ports, triggering UI refreshes
function broadcast() {
  for (const port of listeners.values()) {
    port.postMessage("ping");
  }
}
