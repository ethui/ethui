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
import Panel from "./Base/Panel";

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
  console.log(balances);

  return (
    <Panel>
      <ul role="list" className="divide-y divide-gray-200">
        {address && (
          <li>
            <BalanceETH address={address} />
          </li>
        )}
        {(balances || []).map(([contract, balance]) => (
          <li key={contract}>
            <BalanceERC20
              {...{
                contract,
                balance: BigNumber.from(balance),
              }}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function BalanceETH({ address }: { address: Address }) {
  const { data: balance } = useBalance({ address });

  if (!balance) return <></>;

  return (
    <a href="#" className="px-4 block hover:bg-gray-50">
      <div className="py-4">
        <div className="flex items-center justify-between">
          <p className="min-w-0 truncate text-sm font-medium text-indigo-600">
            {balance.formatted}
          </p>
          <p className="pl-2 flex-grow min-w-0 truncate text-sm font-medium text-gray-600">
            {balance.symbol}
          </p>
        </div>
      </div>
    </a>
  );
}

function BalanceERC20({
  contract,
  balance,
}: {
  contract: Address;
  balance: BigNumber;
}) {
  // const provider = useProvider();
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

  if (!name || !decimals) return <></>;

  return (
    <a href="#" className="px-4 block hover:bg-gray-50">
      <div className="py-4">
        <div className="flex items-center justify-between">
          <p className="min-w-0 truncate text-sm font-medium text-indigo-600">
            {formatUnits(balance, decimals)}
          </p>
          <p className="pl-2 flex-grow min-w-0 truncate text-sm font-medium text-gray-600">
            {name}
          </p>
        </div>
      </div>
    </a>
  );
}
