import type { Wallet } from "@ethui/types/wallets";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface State {
  currentWallet?: Wallet;
  address?: Address;
  wallets: Wallet[];
  allWalletInfo?: WalletInfo[];
}

export interface WalletInfo {
  wallet: Wallet;
  addresses: AddressInfo[];
}

export interface AddressInfo {
  walletName: string;
  key: string;
  address: Address;
  alias: string;
}

interface Setters {
  setCurrentWallet: (name: string) => Promise<void>;
  setCurrentAddress: (name: string) => Promise<void>;
  reload: () => Promise<void>;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  wallets: [],

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
    const allWalletInfo = await fetchAllWalletInfo(wallets);

    set({ wallets, currentWallet, address, allWalletInfo });
  },
});

export const useWallets = create<Store>()(subscribeWithSelector(store));

event.listen("settings-changed", async () => {
  await useWallets.getState().reload();
});
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
