import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultSettings,
  NetworkSettings,
  SettingsFullSchema,
  WalletSettings,
} from "./settings";
import { storageBackend } from "./browserStorageBackend";
import { type Writable } from "stream";
import { WalletSchema } from "./settings/wallet";
import { NetworkSchema } from "./settings/network";
import { Address } from "./addresses";

interface ProviderState {
  isUnlocked: boolean;
  chainId: `0x${string}`;
  networkVersion: string;
  accounts: Address[];
}

interface Setters {
  setWalletSettings: (settings: WalletSchema, stream: Writable) => void;
  setNetworks: (settings: NetworkSchema["networks"], stream: Writable) => void;
  setCurrentNetwork: (index: number, stream: Writable) => void;
  getProviderState: () => ProviderState;
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
    getProviderState: () => {
      const { network, wallet } = get();
      const currentNetwork = network.networks[network.current];

      return {
        isUnlocked: true,
        chainId: `0x${currentNetwork.chainId.toString(16)}`,
        networkVersion: currentNetwork.name,
        accounts: [wallet.address],
      };
    },
  };
}
