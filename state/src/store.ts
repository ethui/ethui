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
import { Address } from "./addresses";

interface ProviderState {
  isUnlocked: boolean;
  chainId: `0x${string}`;
  networkVersion: string;
  accounts: Address[];
}

interface Setters {
  setWalletSettings: (settings: WalletSchema, stream: Stream) => void;
  setNetworks: (settings: NetworkSchema["networks"], stream: Stream) => void;
  setCurrentNetwork: (index: number, stream: Stream) => void;
  getProviderState: () => ProviderState;
  switchToChain: (chainId: number) => void;
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

    // TODO: this is called from the background
    // all others are currently called from expanded.tsx
    // this means storage is being updated, but not the in-memory copy of each process
    // It also means we don't actually broadcast the `chainChanged` event, so
    // even the page that requested this is not updated
    // Need to figure out a way to keep storage centralized on the same process
    switchToChain: (chainId: number) => {
      const network = NetworkSettings.switchToChain(chainId, { get });
      set({ network });
    },
  };
}
