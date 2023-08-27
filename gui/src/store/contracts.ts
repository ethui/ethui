import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { Address } from "viem";
import { StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { IContract } from "../types";
import { useNetworks } from "./networks";

interface State {
  chainId?: number;
  contracts: IContract[];
}

interface Setters {
  reload: () => Promise<void>;
  add: (address: Address) => void;
  setChainId: (chainId?: number) => Promise<void>;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  contracts: [],

  async reload() {
    const { chainId } = get();
    const contracts = await invoke<IContract[]>("db_get_contracts", {
      chainId,
    });
    set({ contracts });
  },

  add: async (address: Address) => {
    const { chainId } = get();
    invoke("db_insert_contract", { chainId, address });
  },

  async setChainId(chainId) {
    set({ chainId });
    get().reload();
  },
});

export const useContracts = create<Store>()(subscribeWithSelector(store));

listen("contracts-changed", async () => {
  await useContracts.getState().reload();
});

useNetworks.subscribe(
  (s) => s.current?.chain_id,
  (chainId) => useContracts.getState().setChainId(chainId),
  { fireImmediately: true }
);
