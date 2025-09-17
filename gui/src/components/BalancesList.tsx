import type { GeneralSettings } from "@ethui/types/settings";
import { useInvoke } from "#/hooks/useInvoke";
import { useBalances } from "#/store/useBalances";
import { useNetworks } from "#/store/useNetworks";
import { ERC20View } from "./ERC20View";

export function BalancesList() {
  return (
    <ul className="w-full">
      <BalanceETH />
      <BalancesERC20 />
    </ul>
  );
}

function BalanceETH() {
  const currentNetwork = useNetworks((s) => s.current);
  const balance = useBalances((s) => s.nativeBalance);

  if (!currentNetwork || !balance) return null;

  return (
    <li className="w-full">
      <ERC20View
        balance={balance}
        decimals={currentNetwork.decimals}
        symbol={currentNetwork.currency}
        chainId={currentNetwork.id.chain_id}
      />
    </li>
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

  return filteredBalances.map(({ contract, balance, metadata }) => (
    <li key={contract} className="w-full">
      <ERC20View
        contract={contract}
        balance={BigInt(balance)}
        decimals={metadata?.decimals || 0}
        symbol={metadata?.symbol}
        chainId={currentNetwork.id.chain_id}
      />
    </li>
  ));
}
