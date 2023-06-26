import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
// import { Action } from "kbar";
import { StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { Address, TokenBalance } from "../types";
import { useNetworks } from "./networks";
import { useWallets } from "./wallets";

interface State {
  nativeBalance?: bigint;
  erc20Balances: TokenBalance[];

  shouldPoll: bool;
  address?: Address;
  chainId?: number;
  interval?: NodeJS.Timer;
}

interface Setters {
  reload: () => Promise<void>;
  // reloadActions: () => Promise<unknown>;

  setAddress: (address?: Address) => void;
  setChainId: (chainId?: number) => void;

  poll: () => Promise<void>;
}

type Store = State & Setters;

const oneMinute = 60 * 1000;

// const actionId = "balances";

const store: StateCreator<Store> = (set, get) => ({
  erc20Balances: [],
  shouldPoll: true,

  async poll() {
    const { address, chainId } = get();
    if (!address || !chainId) return;
    invoke("alchemy_fetch_native_balance", { chainId, address });
    invoke("alchemy_fetch_erc20_balances", { chainId, address });
    invoke("alchemy_fetch_transactions", { address, chainId });
  },

  async reload() {
    const { address, chainId, interval, poll, shouldPoll } = get();
    if (!address || !chainId) return;

    const [native, erc20Balances] = await Promise.all([
      invoke<string>("db_get_native_balance", { address, chainId }),
      invoke<TokenBalance[]>("db_get_erc20_balances", {
        address,
        chainId,
      }),
    ]);

    interval && clearInterval(interval);
    const newInterval = setInterval(poll, oneMinute);
    if (shouldPoll) {
      set({ shouldPoll: false });
      poll();
    }

    set({
      nativeBalance: BigInt(native),
      erc20Balances,
      interval: newInterval,
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

listen("balances-updated", async () => {
  await useBalances.getState().reload();
});

(async () => {
  await useBalances.getState().reload();

  useWallets.subscribe(
    (s) => s.address,
    (address?: Address) => useBalances.getState().setAddress(address),
    { fireImmediately: true }
  );

  useNetworks.subscribe(
    (s) => s.current?.chain_id,
    (chainId) => useBalances.getState().setChainId(chainId),
    { fireImmediately: true }
  );
})();
