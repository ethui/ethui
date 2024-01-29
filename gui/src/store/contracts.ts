import { invoke } from "@tauri-apps/api";
import { Address } from "viem";
import { subscribeWithSelector } from "zustand/middleware";
import { create, StateCreator } from "zustand";

import { errorToast } from "@/components/Toast";
import { useNetworks } from "./networks";

interface State {
  chainId?: number;
  addresses: Address[];
}

interface Setters {
  add: (address: Address) => Promise<void>;
  setChainId: (chainId?: number) => void;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  addresses: [],

  add: async (address: Address) => {
    const { chainId } = get();
    try {
      await invoke("db_insert_contract", { chainId, address });
    } catch (err: unknown) {
      errorToast("contracts-add-error", err);
    }
  },

  setChainId(chainId) {
    set({ chainId });
  },
});

export const useContracts = create<Store>()(subscribeWithSelector(store));

useNetworks.subscribe(
  (s) => s.current?.chain_id,
  (chainId) => useContracts.getState().setChainId(chainId),
  { fireImmediately: true },
);
