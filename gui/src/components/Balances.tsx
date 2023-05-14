import { Stack, Typography } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { erc20ABI } from "@wagmi/core";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils.js";
import React from "react";
import { useEffect } from "react";
import { useBalance, useContractRead } from "wagmi";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { Address } from "../types";
import Panel from "./Panel";

export function Balances() {
  const address = useAccount();
  const { data: balances, mutate } = useInvoke<[Address, string][]>(
    "get_erc20_balances",
    { address }
  );

  useEffect(() => {
    const unlisten = listen("refresh-transactions", () => {
      mutate();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [mutate]);

  return (
    <Panel>
      <Stack>
        {address && <BalanceETH address={address} />}
        {(balances || []).map(([contract, balance]) => (
          <BalanceERC20
            key={contract}
            {...{
              contract,
              balance: BigNumber.from(balance),
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
      {balance.formatted} {balance.symbol}
    </Typography>
  );
}

function BalanceERC20({
  contract,
  balance,
}: {
  contract: Address;
  balance: BigNumber;
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
      {name} {formatUnits(balance, decimals)}
    </Typography>
  );
}
