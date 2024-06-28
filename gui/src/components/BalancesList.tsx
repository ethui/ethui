import { List } from "@mui/material";

import type { GeneralSettings } from "@ethui/types/settings";
import { useInvoke } from "@/hooks";
import { useBalances, useNetworks } from "@/store";
import { ERC20View } from "./ERC20View";

export function BalancesList() {
  return (
    <List sx={{ maxWidth: 350 }}>
      <BalanceETH />
      <BalancesERC20 />
    </List>
  );
}

function BalanceETH() {
  const currentNetwork = useNetworks((s) => s.current);
  const balance = useBalances((s) => s.nativeBalance);

  if (!currentNetwork || !balance) return null;

  return (
    <ERC20View
      balance={balance}
      decimals={currentNetwork.decimals}
      symbol={currentNetwork.currency}
      chainId={currentNetwork.chain_id}
    />
  );
}

function BalancesERC20() {
  const currentNetwork = useNetworks((s) => s.current);
  const balances = useBalances((s) => s.erc20Balances);
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  if (!currentNetwork) return null;

  const filteredBalances = (balances || []).filter(
    (token) => !settings?.hideEmptyTokens || BigInt(token.balance) > 0,
  );

  return (
    <>
      {filteredBalances.map(({ contract, balance, metadata }) => (
        <ERC20View
          key={contract}
          contract={contract}
          balance={BigInt(balance)}
          decimals={metadata?.decimals || 0}
          symbol={metadata?.symbol}
          chainId={currentNetwork.chain_id}
        />
      ))}
    </>
  );
}
