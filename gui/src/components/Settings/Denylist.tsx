import { List } from "@mui/material";

import { GeneralSettings } from "@ethui/types/settings";
import { useInvoke } from "@/hooks";
import { useBalances, useNetworks } from "@/store";
import { ERC20ViewDenylist } from "../ERC20ViewDenylist";

export function SettingsDenylist() {
  const currentNetwork = useNetworks((s) => s.current);
  const balances = useBalances((s) => s.erc20DenyBalances);
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  if (!currentNetwork) return null;

  const filteredBalances = (balances || []).filter(
    (token) => !settings?.hideEmptyTokens || BigInt(token.balance) > 0,
  );

  return (
    <List sx={{ maxWidth: 350 }}>
      <>
        {filteredBalances.map(({ contract, balance, metadata }) => (
          <ERC20ViewDenylist
            key={contract}
            contract={contract}
            balance={BigInt(balance)}
            decimals={metadata?.decimals || 0}
            symbol={metadata?.symbol}
            chainId={currentNetwork.chain_id}
          />
        ))}
      </>
    </List>
  );
}
