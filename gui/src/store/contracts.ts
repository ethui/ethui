import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { Address } from "viem";
import { subscribeWithSelector } from "zustand/middleware";
import { create, StateCreator } from "zustand";

import { Contract } from "@ethui/types";
import { errorToast } from "@/components/Toast";
import { useNetworks } from "./networks";

interface State {
  chainId?: number;
  contracts: Contract[];
}

interface Setters {
  reload: () => Promise<void>;
  add: (chainId: number, address: Address) => Promise<void>;
  setChainId: (chainId?: number) => void;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  contracts: [],

  async reload() {
    const { chainId } = get();
    if (!chainId) return;

    const contracts = await invoke<Contract[]>("db_get_contracts", {
      chainId,
    });
    set({ contracts });
  },

  add: async (chainId: number, address: Address) => {
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

event.listen("contracts-updated", async () => {
  await useContracts.getState().reload();
});

useNetworks.subscribe(
  (s) => s.current?.chain_id,
  (chainId) => useContracts.getState().setChainId(chainId),
  { fireImmediately: true },
);
