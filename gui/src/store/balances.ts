import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
// import { Action } from "kbar";
import { create } from "zustand";

import { Address, TokenBalance, Wallet } from "../types";

interface State {
  nativeBalance?: bigint;
  erc20Balances: TokenBalance[];
}

interface Setters {
  reloadNativeBalance: () => Promise<void>;
  reloadErc20Balances: () => Promise<void>;
  // reloadActions: () => Promise<unknown>;
}

type Store = State & Setters;

// const actionId = "balances";

export const useBalances = create<Store>()((set, get) => ({
  erc20Balances: [],

  async reloadNativeBalance() {},

  async reloadErc20Balances() {},
}));

listen("native-balance-updated", async () => {
  await useBalances.getState().reloadNativeBalance();
});

(async () => {
  await useBalances.getState().reload();
})();
