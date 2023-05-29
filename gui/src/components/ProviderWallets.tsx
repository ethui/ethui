import { invoke } from "@tauri-apps/api/tauri";
import { useRegisterActions } from "kbar";
import { ReactNode, createContext, useEffect, useState } from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshWallets } from "../hooks/useRefreshWallets";
import { Address, Wallet } from "../types";

interface Value {
  wallets?: Wallet[];
  currentWallet?: Wallet;
  setCurrentWallet: (idx: number) => Promise<unknown>;
  setCurrentAddress: (key: string) => Promise<unknown>;
}

export const WalletsContext = createContext<Value>({} as Value);

const actionId = "wallet";

export function ProviderWallets({ children }: { children: ReactNode }) {
  const { data: wallets, mutate: mutateWallets } =
    useInvoke<Wallet[]>("wallets_get_all");
  const { data: currentWallet, mutate: mutateCurrentWallet } =
    useInvoke<Wallet>("wallets_get_current");
  console.log(currentWallet);
  const [addresses, setAddresses] = useState<
    { key: string; address: Address; alias: string }[]
  >([]);

  // fetch addresses and alias for all wallets
  useEffect(() => {
    if (!wallets) return;

    const fetchData = async () => {
      const promises = wallets.map(async ({ name }) => {
        const addresses = await invoke<[string, Address][]>(
          "wallets_get_wallet_addresses",
          {
            wallet: name,
          }
        );

        return { name, addresses };
      });

      const addresses = (await Promise.all(promises)).flat();

      return Promise.all(
        addresses.map(async ([key, address]) => {
          const alias = await invoke<string>("settings_get_alias", { address });
          return { key, address, alias };
        })
      );
    };

    fetchData().then(setAddresses);
  }, [wallets]);

  const value = {
    wallets,
    currentWallet,
    setCurrentWallet: async (idx: number) => {
      console.log("here");
      console.log(wallets, currentWallet, idx);
      if (
        !wallets ||
        !currentWallet ||
        wallets[idx].name === currentWallet.name
      )
        return;

      console.log("here");
      await invoke("wallets_set_current_wallet", { idx });
      mutateCurrentWallet();
    },
    setCurrentAddress: async (key: string) => {
      await invoke("wallets_set_current_path", { key });
      mutateCurrentWallet();
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
      ...(wallets || []).map(({ name }, i) => ({
        id: `${actionId}/${name}`,
        name,
        parent: actionId,
        perform: () => value.setCurrentWallet(i),
      })),

      ...(addresses || []).map(({ key, address, alias }) => ({
        id: `${actionId}/${name}/${key}`,
        name: alias || address,
        parent: `${actionId}/${name}`,
        perform: () => {},
      })),
    ],
    [wallets, value.setCurrentWallet]
  );

  return (
    <WalletsContext.Provider value={value}>{children}</WalletsContext.Provider>
  );
}
