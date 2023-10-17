import { listen } from "@tauri-apps/api/event";
import { Address } from "viem";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { get, post } from "@/api";

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

const store: StateCreator<Store> = (set, storeGet) => ({
  addresses: [],

  async reload() {
    const { chainId } = storeGet();
    if (!chainId) return;

    const addresses = await get<Address[]>("/db/contracts", {
      chainId,
    });
    set({ addresses });
  },

  add: async (address: Address) => {
    const { chainId } = storeGet();
    await post("/db/insert_contract", { chainId, address });
  },

  setChainId(chainId) {
    set({ chainId });
    storeGet().reload();
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
