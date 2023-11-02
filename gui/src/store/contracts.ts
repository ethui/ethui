import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { Address } from "viem";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { errorToast } from "@/components/Toast";

import { useNetworks } from "./networks";

interface State {
  chainId?: number;
  addresses: Address[];
}

interface Setters {
  reload: () => Promise<void>;
  add: (address: Address) => Promise<void>;
  setChainId: (chainId?: number) => void;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  addresses: [],

  async reload() {
    const { chainId } = get();
    if (!chainId) return;

    const addresses = await invoke<Address[]>("db_get_contracts", {
      chainId,
    });
    set({ addresses });
  },

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
    get().reload();
  },
});

export const useContracts = create<Store>()(subscribeWithSelector(store));

listen("contracts-updated", async () => {
  await useContracts.getState().reload();
});

useNetworks.subscribe(
  (s) => s.current?.chain_id,
  (chainId) => useContracts.getState().setChainId(chainId),
  { fireImmediately: true },
);
