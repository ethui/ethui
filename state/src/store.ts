import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultSettings,
  NetworkSettings,
  SettingsSchema,
  WalletSettings,
} from "./settings";
import { storageBackend } from "./browserStorageBackend";
import { deriveAddress } from "./addresses";
import { type Stream } from "stream";

interface Getters {}

interface Setters {
  setWalletSettings: (
    settings: SettingsSchema["wallet"],
    stream: Stream
  ) => void;
  setNetworkSettings: (
    settings: SettingsSchema["network"],
    stream: Stream
  ) => void;
}

type Store = SettingsSchema & Setters & Getters;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      ...generateGetters(get),
      ...generateSetters(get, set),
    }),
    storageBackend
  )
);

function generateGetters(get: () => SettingsSchema): Getters {
  return {
    address: () => {
      const { mnemonic, derivationPath, addressIndex } = get().wallet;
      return deriveAddress(mnemonic, derivationPath, addressIndex);
    },
  };
}

function generateSetters(
  get: () => SettingsSchema,
  set: (partial: Partial<Store>) => void
): Setters {
  return {
    setWalletSettings: (wallet, stream) => {
      const oldWallet = get().wallet;
      wallet = WalletSettings.beforeUpdate(wallet, oldWallet, stream);
      set({ wallet });
    },
    setNetworkSettings: (network, stream) => {
      const oldNetwork = get().network;
      network = NetworkSettings.beforeUpdate(network, oldNetwork, stream);
      set({ network });
    },
  };
}
