import { useRegisterActions } from "kbar";
import { ReactNode, createContext } from "react";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useCurrentNetwork } from "../hooks/useCurrentNetwork";
import { useRefreshBalances } from "../hooks/useRefreshBalances";
import { Address, TokenBalance } from "../types";

interface Value {
  balances: TokenBalance[];
  refetchBalances: () => Promise<void>;
}

export const TokensBalancesContext = createContext<Value>({} as Value);

const actionId = "token-balances";

export function ProviderTokensBalances({ children }: { children: ReactNode }) {
  const address = useAccount();
  const { currentNetwork } = useCurrentNetwork();
  const chainId = currentNetwork?.chain_id;

  const { data: balances, mutate: mutateBalances } = useInvoke<
    [Address, string, string, string][]
  >("db_get_erc20_balances", { chainId, address });

  const { mutate: refetchTokensBalances } = useInvoke(
    "alchemy_fetch_erc20_balances",
    { chainId, address },
    {
      refreshInterval: 10 * 1000 * 60,
      revalidateOnFocus: false,
      revalidateOnMount: false,
    }
  );

  const value = {
    balances: (balances || [])?.map(([address, balance, decimals, symbol]) => [
      address,
      BigInt(balance),
      Number(decimals),
      symbol,
    ]),
    refetchBalances: async () => {
      refetchTokensBalances();
    },
  } as Value;

  useRefreshBalances(mutateBalances);

  useRegisterActions(
    [
      {
        id: actionId,
        name: "Update ERC20 tokens",
        perform: () => value.refetchBalances(),
      },
    ],
    [balances, value.refetchBalances]
  );

  return (
    <TokensBalancesContext.Provider value={value}>
      {children}
    </TokensBalancesContext.Provider>
  );
}
