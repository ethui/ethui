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

  address?: Address;
  chainId?: number;
  interval?: NodeJS.Timer;
}

interface Setters {
  reload: () => Promise<void>;
  // reloadActions: () => Promise<unknown>;

  setAddress: (address?: Address) => void;
  setChainId: (chainId?: number) => void;
}

type Store = State & Setters;

const oneMinute = 60 * 1000;

// const actionId = "balances";

const store: StateCreator<Store> = (set, get) => ({
  erc20Balances: [],

  async reload() {
    const { address, chainId, interval } = get();
    if (!address || !chainId) return;

    const [native, erc20] = await Promise.all([
      invoke<string>("db_get_native_balance", { address, chainId }),
      invoke<[Address, string][]>("db_get_erc20_balances", {
        address,
        chainId,
      }),
    ]);

    console.log("inteervaling");
    interval && clearInterval(interval);
    const poll = () => {
      const { address, chainId } = get();
      invoke("alchemy_fetch_native_balance", { chainId, address });
      invoke("alchmey_fetch_erc20_balances", { chainId, address });
    };
    const newInterval = setInterval(poll, oneMinute);

    set({
      nativeBalance: BigInt(native),
      erc20Balances: erc20.map(([a, c]) => [a, BigInt(c)]),
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
