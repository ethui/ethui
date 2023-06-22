import { useRegisterActions } from "kbar";
import { ReactNode, createContext } from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshNativeBalance } from "../hooks/useRefreshNativeBalance";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { useNetworks, useWallets } from "../store";

interface Value {
  balance: bigint;
  refetchBalance: () => Promise<void>;
}

export const NativeBalanceContext = createContext<Value>({} as Value);

const actionId = "native-balance";

export function ProviderNativeBalance({ children }: { children: ReactNode }) {
  const address = useWallets((s) => s.address);
  const currentNetwork = useNetworks((s) => s.current);
  const chainId = currentNetwork?.chain_id;

  const { data: balance, mutate: mutateBalance } = useInvoke<string>(
    "db_get_native_balance",
    { chainId, address }
  );

  const { mutate: refetchNativeBalance } = useInvoke(
    "alchemy_fetch_native_balance",
    { chainId, address },
    {
      refreshInterval: 10 * 1000 * 60,
      revalidateOnFocus: false,
      revalidateOnMount: false,
    }
  );

  const value = {
    balance: BigInt(balance || "0"),
    refetchBalance: async () => {
      refetchNativeBalance();
    },
  } as Value;

  useRefreshNativeBalance(mutateBalance);
  // Recheck balance after a transaction:
  useRefreshTransactions(refetchNativeBalance);

  useRegisterActions(
    [
      {
        id: actionId,
        name: "Update account balance",
        perform: () => value.refetchBalance(),
      },
    ],
    [value.refetchBalance]
  );

  return (
    <NativeBalanceContext.Provider value={value}>
      {children}
    </NativeBalanceContext.Provider>
  );
}
