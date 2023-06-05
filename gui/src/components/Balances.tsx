import { Stack, Typography } from "@mui/material";
import { erc20ABI } from "@wagmi/core";
import { formatUnits } from "viem";
import { useBalance, useContractRead } from "wagmi";

import { useAccount } from "../hooks";
import { useTokensBalances } from "../hooks/useTokensBalances";
import { Address } from "../types";
import { CopyToClipboard } from "./CopyToClipboard";
import Panel from "./Panel";

export function Balances() {
  return (
    <Panel>
      <Stack>
        <BalanceETH />
        <BalancesERC20 />
      </Stack>
    </Panel>
  );
}

function BalanceETH() {
  const address = useAccount();
  const { data: balance } = useBalance({ address, enabled: !!address });

  if (!balance) return null;

  return (
    <Typography>
      <CopyToClipboard>{balance.formatted}</CopyToClipboard> {balance.symbol}
    </Typography>
  );
}

function BalancesERC20() {
  const { balances } = useTokensBalances();
  return (
    <>
      {balances.map(([contract, balance]) => (
        <BalanceERC20 key={contract} contract={contract} balance={balance} />
      ))}
    </>
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
