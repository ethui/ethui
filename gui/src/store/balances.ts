import { listen } from "@tauri-apps/api/event";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { get } from "@/api";
import { Address, TokenBalance } from "@/types";

import { useNetworks } from "./networks";
import { useWallets } from "./wallets";

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

// const actionId = "balances";

const store: StateCreator<Store> = (set, storeGet) => ({
  erc20Balances: [],

  async reload() {
    const { address, chainId } = storeGet();
    if (!address || !chainId) return;

    const [native, erc20Balances] = await Promise.all([
      get<string>("/db/native_balance", { address, chainId }),
      get<TokenBalance[]>("/db/erc20_balances", {
        address,
        chainId,
      }),
    ]);

    set({
      nativeBalance: BigInt(native),
      erc20Balances,
    });
  },

  setAddress(address) {
    set({ address });
    storeGet().reload();
  },

  setChainId(chainId) {
    set({ chainId });
    storeGet().reload();
  },
});

export const useBalances = create<Store>()(subscribeWithSelector(store));

listen("balances-updated", async () => {
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
