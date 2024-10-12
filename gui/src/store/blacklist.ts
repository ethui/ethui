import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { Address } from "viem";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { Token } from "@ethui/types";
import { useNetworks } from "./networks";
import { useWallets } from "./wallets";

interface State {
  erc20Blacklist: Token[];

  address?: Address;
  chainId?: number;
}

interface Setters {
  reload: () => Promise<void>;

  setAddress: (address?: Address) => void;
  setChainId: (chainId?: number) => void;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  erc20Blacklist: [],

  async reload() {
    const { address, chainId } = get();
    if (!address || !chainId) return;

    const erc20Blacklist = await invoke<Token[]>("db_get_erc20_blacklist", {
      address,
      chainId,
    });

    set({
      erc20Blacklist,
    });
  },

  setAddress(address) {
    set({ address });
    get().reload();
  },

  setChainId(chainId) {
    set({ chainId });
    get().reload();
  },
});

export const useBlacklist = create<Store>()(subscribeWithSelector(store));

event.listen("balances-updated", async () => {
  await useBlacklist.getState().reload();
});

(async () => {
  await useBlacklist.getState().reload();

  useWallets.subscribe(
    (s) => s.address,
    (address?: Address) => useBlacklist.getState().setAddress(address),
    { fireImmediately: true },
  );

  useNetworks.subscribe(
    (s) => s.current?.chain_id,
    (chainId) => useBlacklist.getState().setChainId(chainId),
    { fireImmediately: true },
  );
})();
