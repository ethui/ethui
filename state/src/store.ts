import * as Constants from "@iron/constants";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageWrapper } from "./storageWrapper";
import { Address, NetworkSettings, Settings, WalletSettings } from "./types";
import { deriveAddress } from "./utils";

interface Getters {
  address: () => Address;
}

interface Setters {
  setWalletSettings: (settings: WalletSettings) => void;
  setNetworkSettings: (settings: NetworkSettings) => void;
}

type State = Settings & Setters & Getters;

const defaultSettings: Settings = {
  wallet: {
    mnemonic: Constants.wallet.mnemonic,
    derivationPath: Constants.wallet.path,
    addressIndex: Constants.wallet.index,
  },
  network: {
    rpc: Constants.network.rpc,
  },
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      ...generateGetters(get),
      ...generateSetters(get, set),
    }),
    {
      name: "iron-store",
      storage: createJSONStorage(() => {
        return storageWrapper;
      }),
    }
  )
);

function generateGetters(get: () => Settings): Getters {
  return {
    address: () => {
      const { mnemonic, derivationPath, addressIndex } = get().wallet;
      return deriveAddress(mnemonic, derivationPath, addressIndex);
    },
  };
}
function generateSetters(
  _get: () => Settings,
  set: (partial: Partial<State>) => void
): Setters {
  return {
    setWalletSettings: (wallet) => {
      set({ wallet });
    },
    setNetworkSettings: (network) => {
      set({ network });
    },
  };
}
