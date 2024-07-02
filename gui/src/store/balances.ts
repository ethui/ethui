import { event, invoke } from "@tauri-apps/api";
import { Address } from "viem";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { TokenBalance } from "@ethui/types";
import { useNetworks } from "./networks";
import { useWallets } from "./wallets";

interface State {
  nativeBalance?: bigint;
  erc20Balances: TokenBalance[];
  erc20DenyBalances: TokenBalance[];

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
  erc20Balances: [],
  erc20DenyBalances:[],

  async reload() {
    const { address, chainId } = get();
    if (!address || !chainId) return;

    const nativeBalance = await invoke<string>("sync_get_native_balance", {
      address,
      chainId,
    });
    const erc20Balances = await invoke<TokenBalance[]>(
      "db_get_erc20_balances",
      {
        address,
        chainId,
      },
    );
    const erc20DenyBalances = await invoke<TokenBalance[]>(
      "db_get_erc20_denylist_balances",
      {
        address,
        chainId,
      },
    );

    set({
      nativeBalance: BigInt(nativeBalance),
      erc20Balances,
      erc20DenyBalances,
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

export const useBalances = create<Store>()(subscribeWithSelector(store));

event.listen("balances-updated", async () => {
  await useBalances.getState().reload();
});

(async () => {
  await useBalances.getState().reload();

  useWallets.subscribe(
    (s) => s.address,
    (address?: Address) => useBalances.getState().setAddress(address),
    { fireImmediately: true },
  );

  useNetworks.subscribe(
    (s) => s.current?.chain_id,
    (chainId) => useBalances.getState().setChainId(chainId),
    { fireImmediately: true },
  );
})();
