import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { Action } from "kbar";
import { create } from "zustand";

import { Address, Wallet } from "../types";

interface State {
  currentWallet?: Wallet;
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
  setCurrentWallet: (name: string) => Promise<unknown>;
  setCurrentAddress: (name: string) => Promise<unknown>;
  reload: () => Promise<unknown>;
  reloadActions: () => Promise<unknown>;
}

type Store = State & Setters;

const actionId = "wallet";

export const useWallets = create<Store>()((set, get) => ({
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
    const wallets = await invoke<Wallet[]>("wallets_get_all");
    const currentWallet = await invoke<Wallet>("wallets_get_current");

    set({ wallets, currentWallet });
    get().reloadActions();
  },

  async reloadActions() {
    const { wallets } = get();
    const info = await fetchAllWalletInfo(wallets);

    const actions = [
      {
        id: actionId,
        name: "Change wallet",
      },
      // create action for each wallet
      ...(info || [])
        .map(({ wallet, addresses }) => [
          {
            id: `${actionId}/${wallet.name}`,
            name: wallet.name,
            parent: actionId,
            perform: () => get().setCurrentWallet(wallet.name),
          },

          // create action for each address
          ...(addresses || []).map(({ key, address, alias }) => ({
            id: `${actionId}/${wallet.name}/${key}`,
            name: alias || address,
            parent: `${actionId}/${wallet.name}`,
            perform: () => {
              get().setCurrentWallet(wallet.name);
              get().setCurrentAddress(key);
            },
          })),
        ])
        .flat(),

      ...(wallets || []).map(({ name }) => ({
        id: `${actionId}/${name}`,
        name,
        parent: actionId,
        perform: () => get().setCurrentWallet(name),
      })),
    ];

    set({ actions });
  },
}));

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
          { name: wallet.name }
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
            }))
          ),
        };
      })
    )
  ).flat();
