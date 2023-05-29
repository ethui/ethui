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

interface AddressInfo {
  key: string;
  address: Address;
  alias: string;
  walletName: string;
}

export const WalletsContext = createContext<Value>({} as Value);

const actionId = "wallet";

export function ProviderWallets({ children }: { children: ReactNode }) {
  const { data: wallets, mutate: mutateWallets } =
    useInvoke<Wallet[]>("wallets_get_all");
  const { data: currentWallet, mutate: mutateCurrentWallet } =
    useInvoke<Wallet>("wallets_get_current");
  console.log(currentWallet);
  const [addresses, setAddresses] = useState<AddressInfo[]>([]);

  // fetch addresses and alias for all wallets
  useEffect(() => {
    if (!wallets) return;
    fetchAllAddresses(wallets).then(setAddresses);
  }, [wallets]);

  const value = {
    wallets,
    currentWallet,
    setCurrentWallet: async (name: string) => {
      const idx = (wallets || []).findIndex((w) => w.name === name);
      console.log(name, wallets);
      console.log(idx);
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
    mutate(() => true);
  });

  useRegisterActions(
    [
      {
        id: actionId,
        name: "Change wallet",
      },
      ...(wallets || []).map(({ name }) => ({
        id: `${actionId}/${name}`,
        name,
        parent: actionId,
        perform: () => value.setCurrentWallet(name),
      })),

      ...(addresses || []).map(({ walletName, key, address, alias }) => ({
        id: `${actionId}/${walletName}/${key}`,
        name: alias || address,
        parent: `${actionId}/${walletName}`,
        perform: () => {
          value.setCurrentWallet(walletName);
          value.setCurrentAddress(key);
        },
      })),
    ],
    [wallets, value.setCurrentWallet]
  );

  return (
    <WalletsContext.Provider value={value}>{children}</WalletsContext.Provider>
  );
}

/// Transfofrm wallets into a flat array of addresses with their alias
const fetchAllAddresses = async (wallets: Wallet[]): Promise<AddressInfo[]> =>
  (
    await Promise.all(
      // get all addresses for each wallet
      wallets.map(async ({ name }) => {
        const addresses = await invoke<[string, Address][]>(
          "wallets_get_wallet_addresses",
          {
            name,
          }
        );

        return Promise.all(
          // get the alias for each address
          addresses.map(async ([key, address]) => ({
            key,
            address,
            walletName: name,
            alias: await invoke<string>("settings_get_alias", { address }),
          }))
        );
      })
    )
  ).flat();
