import { invoke, event } from "@tauri-apps/api";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { Action } from "kbar";
import type { Address } from "viem";

import type { Wallet } from "@ethui/types/wallets";

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
  walletName: string;
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

const store: StateCreator<Store> = (set, get) => ({
  wallets: [],
  actions: [],

  async setCurrentWallet(name: string) {
    const { wallets, currentWallet } = get();
    const idx = (wallets || []).findIndex((w) => w.name === name);
    if (!wallets || !currentWallet || wallets[idx].name === currentWallet.name)
      return;

    await invoke("wallets_set_current_wallet", { idx });
    get().reload();
  },

  async setCurrentAddress(key: string) {
    await invoke("wallets_set_current_path", { key });
    get().reload();
  },

  async reload() {
    const [wallets, currentWallet, address] = await Promise.all([
      invoke<Wallet[]>("wallets_get_all"),
      invoke<Wallet>("wallets_get_current"),
      invoke<Address>("wallets_get_current_address"),
    ]);

    set({ wallets, currentWallet, address });
    get().reloadActions();
  },

  async reloadActions() {
    const { wallets } = get();
    const info = (await fetchAllWalletInfo(wallets)) || [];

    const actions = [
      {
        id: actionId,
        name: "Change wallet",
        subtitle: `${wallets.length} wallet${
          wallets.length > 1 ? "s" : ""
        } available`,
        shortcut: ["W"],
      },
      ...info.flatMap(({ wallet, addresses }, index) => {
        return [
          {
            id: `${actionId}/${wallet.name}`,
            //Since the kbar searches through its options by "name" (and not "shortcut"),
            //we pass the index in the name.
            //Users can then type the number > press Enter > view available accounts from the chosen wallet.
            name: `${index + 1}: ${wallet.name}`,
            parent: actionId,
          },
          ...(addresses || []).map(({ key, address }, index) => {
            return {
              id: `${actionId}/${wallet.name}/${key}`,
              name: `${index + 1}: ${address}`,
              section: "Choose account:",
              parent: `${actionId}/${wallet.name}`,
              perform: () => {
                get().setCurrentWallet(wallet.name);
                get().setCurrentAddress(key);
                get().reload();
              },
            };
          }),
        ];
      }),
    ];

    set({ actions });
  },
});

export const useWallets = create<Store>()(subscribeWithSelector(store));

event.listen("wallets-changed", async () => {
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
              alias: await invoke<string>("settings_get_alias", { address }),
            })),
          ),
        };
      }),
    )
  ).flat();
