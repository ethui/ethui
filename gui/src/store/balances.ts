import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
// import { Action } from "kbar";
import { StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { Address, TokenBalance, Wallet } from "../types";
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

const oneMinute = 10 * 1000 * 60;

// const actionId = "balances";

const store: StateCreator<Store> = (set, get) => ({
  erc20Balances: [],

  async reload() {
    const { address, chainId, interval } = get();
    console.log(address, chainId);
    if (!address || !chainId) return;

    const [native, erc20] = await Promise.all([
      invoke<string>("db_get_native_balance", { address, chainId }),
      invoke<[Address, string][]>("db_get_erc20_balances", {
        address,
        chainId,
      }),
    ]);

    interval && clearInterval(interval);
    const newInterval = setInterval(() => {
      const { address, chainId } = get();
      console.log("invoking", address, chainId);
      invoke("alchemy_fetch_native_balance", { chainId, address });
      invoke("alchmey_fetch_erc20_balances", { chainId, address });
    }, oneMinute);

    set({
      nativeBalance: BigInt(native),
      erc20Balances: erc20.map(([a, c]) => [a, BigInt(c)]),
      interval: newInterval,
    });
  },

  setAddress(address) {
    console.log("setAddress", address);
    set({ address });
    get().reload();
  },

  setChainId(chainId) {
    console.log(chainId);
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
    (s) => {
      // console.log("sub", s);
      // return "foo"
      return s.address;
    },
    (foo) => console.log("result", foo),
    // (address?: Address) => {
    // console.log("here", address);
    // useBalances.getState().setAddress(address);
    // },
    { fireImmediately: true }
  );

  useNetworks.subscribe(
    (s) => s.current?.chain_id,
    (chainId) => useBalances.getState().setChainId(chainId),
    { fireImmediately: true }
  );
})();
