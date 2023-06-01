import { Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { erc20ABI } from "@wagmi/core";
import { useEffect } from "react";
import { formatUnits } from "viem";
import { useBalance, useContractRead } from "wagmi";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { useNetworks } from "../hooks/useNetworks";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address } from "../types";
import { CopyToClipboard } from "./CopyToClipboard";
import Panel from "./Panel";

export function Balances() {
  const address = useAccount();
  const { currentNetwork } = useNetworks();
  const { data: balances, mutate } = useInvoke<[Address, string][]>(
    "db_get_erc20_balances",
    { address }
  );

  useEffect(() => {
    (async () => {
      if (currentNetwork && address) {
        await invoke("alchemy_fetch_balances", {
          chainId: currentNetwork.chain_id,
          address,
        });
        mutate();
      }
    })();
  }, [address, currentNetwork, mutate]);

  useRefreshTransactions(mutate);

  return (
    <Panel>
      <Stack>
        {address && <BalanceETH address={address} />}
        {(balances || []).map(([contract, balance]) => (
          <BalanceERC20
            key={contract}
            {...{
              contract,
              balance: BigInt(balance),
            }}
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
