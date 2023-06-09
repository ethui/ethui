import { Stack, Typography } from "@mui/material";
import { formatUnits } from "viem";
import { erc20ABI, useBalance, useContractRead } from "wagmi";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useCurrentNetwork } from "../hooks/useCurrentNetwork";
import { useTokensBalances } from "../hooks/useTokensBalances";
import { Address, GeneralSettings } from "../types";
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
  const { currentNetwork } = useCurrentNetwork();
  const { data: balance } = useBalance({
    address,
    enabled: !!address,
    chainId: currentNetwork?.chain_id,
  });

  if (!balance) return null;

  return (
    <Typography>
      <CopyToClipboard>{balance.formatted}</CopyToClipboard> {balance.symbol}
    </Typography>
  );
}

function BalancesERC20() {
  const { balances } = useTokensBalances();
  const { currentNetwork } = useCurrentNetwork();
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const filteredBalances = (balances || [])
    .map<[Address, bigint]>(([c, b]) => [c, BigInt(b)])
    .filter(([, balance]) => (settings?.hideEmptyTokens ? !!balance : true));

  return (
    <>
      {filteredBalances.map(([contract, balance]) => (
        <BalanceERC20
          key={contract}
          contract={contract}
          balance={balance}
          chainId={currentNetwork?.chain_id}
        />
      ))}
    </>
  );
}

function BalanceERC20({
  contract,
  balance,
  chainId,
}: {
  contract: Address;
  balance: bigint;
  chainId?: number;
}) {
  const { data: name } = useContractRead({
    address: contract,
    abi: erc20ABI,
    functionName: "symbol",
    chainId,
  });

  const { data: decimals } = useContractRead({
    address: contract,
    abi: erc20ABI,
    functionName: "decimals",
    chainId,
  });

  if (!name || !decimals) return null;

  return (
    <Typography>
      {name} <CopyToClipboard>{formatUnits(balance, decimals)}</CopyToClipboard>
    </Typography>
  );
}
