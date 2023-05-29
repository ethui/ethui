import { invoke } from "@tauri-apps/api/tauri";
import { useRegisterActions } from "kbar";
import { ReactNode, createContext } from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshWallets } from "../hooks/useRefreshWallets";
import { Wallet } from "../types";

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
    ],
    [wallets, value.setCurrentWallet]
  );

  return (
    <WalletsContext.Provider value={value}>{children}</WalletsContext.Provider>
  );
}
