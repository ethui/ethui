import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { Action } from "kbar";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { get, post } from "@/api";
import { Address, Wallet } from "@/types";

interface State {
  currentWallet?: Wallet;
  address?: Address;
  wallets: Wallet[];
  actions: Action[];
}

interface WalletInfo {
  wallet: Wallet;
  addresses: AddressInfo[];
}

interface AddressInfo {
  key: string;
  address: Address;
  alias: string;
}

interface Setters {
  setCurrentWallet: (name: string) => Promise<void>;
  setCurrentAddress: (name: string) => Promise<void>;
  reload: () => Promise<void>;
  reloadActions: () => Promise<unknown>;
}

type Store = State & Setters;

const actionId = "wallet";

const store: StateCreator<Store> = (set, storeGet) => ({
  wallets: [],
  actions: [],

  async setCurrentWallet(name: string) {
    const { wallets, currentWallet } = storeGet();
    const idx = (wallets || []).findIndex((w) => w.name === name);
    if (!wallets || !currentWallet || wallets[idx].name === currentWallet.name)
      return;

    await post("/wallets/current_wallet", { idx });
    storeGet().reload();
  },

  async setCurrentAddress(key: string) {
    await post("/wallets/current_path", { key });
    storeGet().reload();
  },

  async reload() {
    const [wallets, currentWallet, address] = await Promise.all([
      get<Wallet[]>("/wallets/all"),
      get<Wallet>("/wallets/current_wallet"),
      get<Address>("/wallets/current_address"),
    ]);

    set({ wallets, currentWallet, address });
    storeGet().reloadActions();
  },

  async reloadActions() {
    const { wallets } = storeGet();
    const info = (await fetchAllWalletInfo(wallets)) || [];

    const actions = [
      {
        id: actionId,
        name: "Change wallet",
      },
      ...info
        .map(({ wallet, addresses }) => [
          {
            id: `${actionId}/${wallet.name}`,
            name: wallet.name,
            parent: actionId,
          },
          ...(addresses || []).map(({ key, address, alias }) => ({
            id: `${actionId}/${wallet.name}/${key}`,
            name: alias || address,
            parent: `${actionId}/${wallet.name}`,
            perform: () => {
              storeGet().setCurrentWallet(wallet.name);
              storeGet().setCurrentAddress(key);
            },
          })),
        ])
        .flat(),
    ];

    set({ actions });
  },
});

export const useWallets = create<Store>()(subscribeWithSelector(store));

listen("wallets-changed", async () => {
  await useWallets.getState().reload();
});

(async () => {
  await useWallets.getState().reload();
})();

/// Transform wallets into a flat array of addresses with their alias
const fetchAllWalletInfo = async (wallets: Wallet[]): Promise<WalletInfo[]> =>
  (
    await Promise.all(
      // get all addresses for each wallet
      wallets.map(async (wallet) => {
        const addresses = await invoke<[string, Address][]>(
          "wallets_get_wallet_addresses",
          { name: wallet.name },
        );

        return {
          wallet,
          addresses: await Promise.all(
            // get the alias for each address
            addresses.map(async ([key, address]) => ({
              key,
              address,
              walletName: wallet.name,
              alias: await get<string>("/settings/alias", { address }),
            })),
          ),
        };
      }),
    )
  ).flat();
