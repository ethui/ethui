import * as Constants from "@iron/constants";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageWrapper } from "./storageWrapper";
import { Address, NetworkSettings, Settings, WalletSettings } from "./types";

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

function generateGetters(get: () => Settings): Getters {
  return {
    address: () => {
      const { mnemonic, derivationPath, addressIndex } = get().wallet;
      return deriveAddress(mnemonic, derivationPath, addressIndex);
    },
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      ...generateGetters(get),
      setWalletSettings: (wallet) => {
        set({ wallet });
      },
      setNetworkSettings: (network) => {
        set({ network });
      },
    }),
    {
      name: "iron-store",
      storage: createJSONStorage(() => {
        return storageWrapper;
      }),
    }
  )
);

// TODO: this needs to be generated from the mnemonic
export function deriveAddress(
  _mnemonic: string,
  _path: string,
  _index: number
): Address {
  return "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
}
