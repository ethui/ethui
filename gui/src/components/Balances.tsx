import { Stack, Typography } from "@mui/material";
import { erc20ABI } from "@wagmi/core";
import { formatUnits } from "viem";
import { useBalance, useContractRead } from "wagmi";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address, GeneralSettings } from "../types";
import { CopyToClipboard } from "./CopyToClipboard";
import Panel from "./Panel";

export function Balances() {
  const address = useAccount();
  const { data: balances, mutate } = useInvoke<[Address, string][]>(
    "db_get_erc20_balances",
    { address }
  );
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const reorderedBalances = (balances || [])
    .map<[`0x${string}`, bigint]>(([c, b]) => [c, BigInt(b)]) // is it possible to get the proper type from backend directly?
    .filter(([, balance]) => (settings?.hideEmptyTokens ? !!balance : true))
    .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0));

  useRefreshTransactions(mutate);

  return (
    <Panel>
      <Stack>
        {address && <BalanceETH address={address} />}
        {reorderedBalances.map(([contract, balance]) => (
          <BalanceERC20
            key={contract}
            contract={contract}
            balance={BigInt(balance)}
          />
        ))}
      </Stack>
    </Panel>
  );
}

function BalanceETH({ address }: { address: Address }) {
  const { data: balance } = useBalance({ address });

  if (!balance) return null;

  return (
    <Typography>
      <CopyToClipboard>{balance.formatted}</CopyToClipboard> {balance.symbol}
    </Typography>
  );
}

function BalanceERC20({
  contract,
  balance,
}: {
  contract: Address;
  balance: bigint;
}) {
  const { data: name } = useContractRead({
    address: contract,
    abi: erc20ABI,
    functionName: "symbol",
  });

  const { data: decimals } = useContractRead({
    address: contract,
    abi: erc20ABI,
    functionName: "decimals",
  });

  if (!name || !decimals) return null;

  return (
    <Typography>
      {name} <CopyToClipboard>{formatUnits(balance, decimals)}</CopyToClipboard>
    </Typography>
  );
}
