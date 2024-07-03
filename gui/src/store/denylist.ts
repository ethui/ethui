import { event, invoke } from "@tauri-apps/api";
import { Address } from "viem";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { Token } from "@ethui/types";
import { useNetworks } from "./networks";
import { useWallets } from "./wallets";

interface State {
  erc20Denylist: Token[];

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
  erc20Denylist: [],

  async reload() {
    const { address, chainId } = get();
    if (!address || !chainId) return;

    const erc20Denylist = await invoke<Token[]>(
      "db_get_erc20_denylist",
      {
        address,
        chainId,
      },
    );

    set({
      erc20Denylist,
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

export const useDenylist = create<Store>()(subscribeWithSelector(store));

event.listen("balances-updated", async () => {
  await useDenylist.getState().reload();
});

(async () => {
  await useDenylist.getState().reload();

  useWallets.subscribe(
    (s) => s.address,
    (address?: Address) => useDenylist.getState().setAddress(address),
    { fireImmediately: true },
  );

  useNetworks.subscribe(
    (s) => s.current?.chain_id,
    (chainId) => useDenylist.getState().setChainId(chainId),
    { fireImmediately: true },
  );
})();
