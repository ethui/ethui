import type { TokenBalance } from "@ethui/types";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useNetworks } from "./useNetworks";
import { useWallets } from "./useWallets";

interface State {
  nativeBalance?: bigint;
  erc20Balances: TokenBalance[];

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

  async reload() {
    const { address, chainId } = get();
    if (!address || !chainId) return;

    let nativeBalance = "0";
    try {
      nativeBalance = await invoke<string>("sync_get_native_balance", {
        address,
        chainId,
      });
    } catch (_e) {}
    const erc20Balances = await invoke<TokenBalance[]>(
      "db_get_erc20_balances",
      {
        address,
        chainId,
      },
    );

    set({
      nativeBalance: BigInt(nativeBalance),
      erc20Balances,
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
    (s) => s.current?.id.chain_id,
    (chainId) => useBalances.getState().setChainId(chainId),
    { fireImmediately: true },
  );
})();
