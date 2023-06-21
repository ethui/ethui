import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
} from "@mui/material";
import { formatUnits } from "viem";

import { useInvoke } from "../hooks/tauri";
import { useCurrentNetwork } from "../hooks/useCurrentNetwork";
import { useNativeBalance } from "../hooks/useNativeBalance";
import { useTokensBalances } from "../hooks/useTokensBalances";
import { GeneralSettings } from "../types";
import { CopyToClipboard } from "./CopyToClipboard";
import { CryptoIcon } from "./IconCrypto";
import Panel from "./Panel";

export function BalancesList() {
  return (
    <Panel>
      <Stack>
        <List>
          <BalanceETH />
          <BalancesERC20 />
        </List>
      </Stack>
    </Panel>
  );
}

function BalanceETH() {
  const { currentNetwork } = useCurrentNetwork();
  const { balance } = useNativeBalance();

  if (!currentNetwork) return null;

  return (
    <BalanceItem
      balance={balance}
      decimals={currentNetwork.decimals}
      symbol={currentNetwork.currency}
    />
  );
}

function BalancesERC20() {
  const { balances } = useTokensBalances();
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const filteredBalances = (balances || []).filter(([, balance]) =>
    settings?.hideEmptyTokens ? !!balance : true
  );

  return (
    <>
      {filteredBalances.map(([contract, balance, decimals, symbol]) => (
        <BalanceERC20
          key={contract}
          balance={balance}
          decimals={decimals}
          symbol={symbol}
        />
      ))}
    </>
  );
}

function BalanceERC20({
  balance,
  decimals,
  symbol,
}: {
  balance: bigint;
  decimals: number;
  symbol: string;
}) {
  if (!symbol || !decimals) return null;

  return <BalanceItem balance={balance} decimals={decimals} symbol={symbol} />;
}

interface BalanceItemProps {
  balance: bigint;
  decimals: number;
  symbol: string;
}

function BalanceItem({ balance, decimals, symbol }: BalanceItemProps) {
  // Some tokens respond with 1 decimals, that breaks this truncatedBalance without the Math.ceil
  const truncatedBalance =
    balance - (balance % BigInt(Math.ceil(0.001 * 10 ** decimals)));

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar>
          <CryptoIcon ticker={symbol} />
        </Avatar>
      </ListItemAvatar>
      <ListItemText secondary={symbol}>
        <CopyToClipboard label={balance.toString()}>
          {formatUnits(truncatedBalance, decimals)}
        </CopyToClipboard>
      </ListItemText>
    </ListItem>
  );
}
