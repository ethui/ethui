import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
} from "@mui/material";
import truncateEthAddress from "truncate-eth-address";
import { Address, formatUnits } from "viem";

import { useInvoke } from "../hooks";
import { useBalances, useNetworks } from "../store";
import { GeneralSettings } from "../types";
import { CopyToClipboard, IconCrypto, Panel } from "./";

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
  const currentNetwork = useNetworks((s) => s.current);
  const balance = useBalances((s) => s.nativeBalance);

  if (!currentNetwork || !balance) return null;

  return (
    <BalanceItem
      balance={balance}
      decimals={currentNetwork.decimals}
      symbol={currentNetwork.currency}
    />
  );
}

function BalancesERC20() {
  const balances = useBalances((s) => s.erc20Balances);
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const filteredBalances = (balances || []).filter(
    (token) => !settings?.hideEmptyTokens || BigInt(token.balance) > 0
  );

  return (
    <>
      {filteredBalances.map(({ contract, balance, metadata }) => (
        <BalanceItem
          key={contract}
          contract={contract}
          balance={BigInt(balance)}
          decimals={metadata.decimals}
          symbol={metadata.symbol}
        />
      ))}
    </>
  );
}

interface BalanceItemProps {
  contract?: Address;
  balance: bigint;
  decimals: number;
  symbol: string;
}

function BalanceItem({
  balance,
  decimals,
  symbol,
  contract,
}: BalanceItemProps) {
  const minimum = 0.001;
  // Some tokens respond with 1 decimals, that breaks this truncatedBalance without the Math.ceil
  const truncatedBalance =
    balance - (balance % BigInt(Math.ceil(minimum * 10 ** decimals)));

  if (!symbol || !decimals) return null;
  console.log(contract);

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar>
          <IconCrypto ticker={symbol} />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        secondary={`${symbol} ${
          contract ? `(${truncateEthAddress(contract)})` : ``
        }`}
      >
        <CopyToClipboard label={balance.toString()}>
          {truncatedBalance > 0
            ? formatUnits(truncatedBalance, decimals)
            : `< ${minimum}`}
        </CopyToClipboard>
      </ListItemText>
    </ListItem>
  );
}
