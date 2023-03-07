import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultSettings,
  NetworkSettings,
  SettingsFullSchema,
  WalletSettings,
} from "./settings";
import { storageBackend } from "./browserStorageBackend";
import { type Stream } from "stream";
import { WalletSchema } from "./settings/wallet";
import { NetworkSchema } from "./settings/network";

interface Setters {
  setWalletSettings: (settings: WalletSchema, stream: Stream) => void;
  setNetworks: (settings: NetworkSchema["networks"], stream: Stream) => void;
  setCurrentNetwork: (index: number, stream: Stream) => void;
}

type Store = SettingsFullSchema & Setters;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      ...generateSetters(get, set),
    }),
    storageBackend
  )
);

function generateSetters(
  get: () => SettingsFullSchema,
  set: (partial: Partial<Store>) => void
): Setters {
  return {
    setWalletSettings: (newWallet, stream) => {
      const wallet = WalletSettings.setWalletSettings(newWallet, {
        get,
        stream,
      });
      set({ wallet });
    },
    setNetworks: (networks, stream) => {
      const network = NetworkSettings.setNetworks(networks, {
        get,
        stream,
      });
      set({ network });
    },
    setCurrentNetwork: (idx, stream) => {
      const network = NetworkSettings.setCurrentNetwork(idx, {
        get,
        stream,
      });
      set({ network });
    },
  };
}
