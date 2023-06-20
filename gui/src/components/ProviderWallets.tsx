import { invoke } from "@tauri-apps/api/tauri";
import { useRegisterActions } from "kbar";
import { ReactNode, createContext, useEffect, useState } from "react";
import { mutate } from "swr";

import { useInvoke } from "../hooks/tauri";
import { useRefreshWallets } from "../hooks/useRefreshWallets";
import { Address, Wallet } from "../types";

interface Value {
  wallets?: Wallet[];
  currentWallet?: Wallet;
  setCurrentWallet: (name: string) => Promise<unknown>;
  setCurrentAddress: (key: string) => Promise<unknown>;
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

export const WalletsContext = createContext<Value>({} as Value);

const actionId = "wallet";

export function ProviderWallets({ children }: { children: ReactNode }) {
  const { data: wallets, mutate: mutateWallets } =
    useInvoke<Wallet[]>("wallets_get_all");
  const { data: currentWallet, mutate: mutateCurrentWallet } =
    useInvoke<Wallet>("wallets_get_current");
  const [info, setInfo] = useState<WalletInfo[]>([]);

  // fetch addresses and alias for all wallets
  useEffect(() => {
    if (!wallets) return;
    fetchAllWalletInfo(wallets).then(setInfo);
  }, [wallets]);

  const value = {
    wallets,
    currentWallet,
    setCurrentWallet: async (name: string) => {
      const idx = (wallets || []).findIndex((w) => w.name === name);
      if (
        !wallets ||
        !currentWallet ||
        wallets[idx].name === currentWallet.name
      )
        return;

      await invoke("wallets_set_current_wallet", { idx });
      mutate(() => true);
    },
    setCurrentAddress: async (key: string) => {
      await invoke("wallets_set_current_path", { key });
      mutate(() => true);
    },
  };

  useRefreshWallets(() => {
    mutateWallets();
    mutateCurrentWallet();
  });

  useRegisterActions(
    [
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
            perform: () => {
              value.setCurrentWallet(wallet.name);
            },
          },

          // create action for each address
          ...(addresses || []).map(({ key, address, alias }) => ({
            id: `${actionId}/${wallet.name}/${key}`,
            name: alias || address,
            parent: `${actionId}/${wallet.name}`,
            perform: () => {
              value.setCurrentWallet(wallet.name);
              value.setCurrentAddress(key);
            },
          })),
        ])
        .flat(),

      ...(wallets || []).map(({ name }) => ({
        id: `${actionId}/${name}`,
        name,
        parent: actionId,
        perform: () => value.setCurrentWallet(name),
      })),
    ],
    [wallets, value.setCurrentWallet]
  );

  return (
    <WalletsContext.Provider value={value}>{children}</WalletsContext.Provider>
  );
}

/// Transfofrm wallets into a flat array of addresses with their alias
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
