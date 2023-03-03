import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultSettings,
  NetworkSettings,
  SettingsSchema,
  WalletSettings,
} from "./settings";
import { storageBackend } from "./browserStorageBackend";
import { type Address, deriveAddress } from "./addresses";

interface Getters {
  address: () => Address;
}

interface Setters {
  setWalletSettings: (settings: SettingsSchema["wallet"]) => void;
  setNetworkSettings: (settings: SettingsSchema["network"]) => void;
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
  _get: () => SettingsSchema,
  set: (partial: Partial<Store>) => void
): Setters {
  return {
    setWalletSettings: (wallet) => {
      wallet = WalletSettings.beforeUpdate(wallet);
      set({ wallet });
    },
    setNetworkSettings: (network) => {
      network = NetworkSettings.beforeUpdate(network);
      set({ network });
    },
  };
}
