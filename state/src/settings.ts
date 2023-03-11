import { ethers } from "ethers";
import _ from "lodash";
import { Runtime } from "webextension-polyfill";

import { broadcastViaProviders } from "@iron/provider-worker";

import { deriveAddress, deriveAddressFromNode } from "./addresses";
import { read, write } from "./browserStorageBackend";
import { State, defaults } from "./schema";

export const listeners: Map<string, Runtime.Port> = new Map();

let hdNode: ethers.utils.HDNode;

export const settings: State = {
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
    const addressChanged = address !== this.wallet.address;

    this.wallet = { address, ...settings };
    broadcast();
    write("wallets", this.wallet);

    if (addressChanged) {
      broadcastViaProviders({ method: "accountsChanged", params: [address] });
    }
  },

  getAll() {
    return { wallet: this.wallet, network: this.network };
  },

  setNetworks(networks) {
    const currentNetwork = this.network.networks[this.network.current];

    this.network.networks = networks;
    broadcast();
    write("networks", this.network);

    // if current network changed, broadcast
    const newNetwork = this.network.networks[this.network.current];
    if (!_.isEqual(currentNetwork, newNetwork)) {
      broadcastViaProviders({
        method: "chainChanged",
        params: {
          chainId: `0x${newNetwork.chainId.toString(16)}`,
          networkVersion: newNetwork.name,
        },
      });
    }
  },

  setCurrentNetwork(idx) {
    const chainChanged = idx !== this.network.current;
    this.network.current = idx;
    broadcast();
    write("networks", this.network);

    if (chainChanged) {
      const network = this.network.networks[idx];
      broadcastViaProviders({
        method: "chainChanged",
        params: {
          chainId: `0x${network.chainId.toString(16)}`,
          networkVersion: network.name,
        },
      });
    }
  },

  getAddress() {
    return deriveAddress(
      this.wallet.mnemonic,
      this.wallet.derivationPath,
      this.wallet.addressIndex
    );
  },

  getProvider() {
    const network = this.network.networks[this.network.current];
    return new ethers.providers.JsonRpcProvider(network.url);
  },

  getSigner() {
    const { derivationPath, addressIndex } = this.wallet;
    const child = hdNode.derivePath(`${derivationPath}/${addressIndex}`);
    return new ethers.Wallet(child.privateKey, this.getProvider());
  },
};

export async function initState() {
  settings.wallet = await read("wallet", defaults.wallet);
  settings.network = await read("network", defaults.network);
  hdNode = ethers.utils.HDNode.fromMnemonic(settings.wallet.mnemonic);
}

// ping all polling ports, triggering UI refreshes
function broadcast() {
  for (const port of listeners.values()) {
    port.postMessage("ping");
  }
}
