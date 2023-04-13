import { listen } from "@tauri-apps/api/event";
import { BigNumber, ethers } from "ethers";
import { useEffect } from "react";
import { useContractRead } from "wagmi";

import { useAccount, useProvider } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { Address } from "../types";

export function Balances() {
  const address = useAccount();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const provider = useProvider();
  const { data: balances, mutate } = useInvoke<[Address, string][]>(
    "get_erc20_balances",
    { address }
  );
  console.log(balances);

  useEffect(() => {
    const unlisten = listen("refresh-transactions", () => {
      mutate();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [mutate]);

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <ul role="list" className="divide-y divide-gray-200">
        {(balances || []).map(([contract, balance]) => (
          <li key={contract}>
            <Balance
              {...{
                contract,
                balance: BigNumber.from(balance),
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Balance({
  contract,
  balance,
}: {
  contract: Address;
  balance: BigNumber;
}) {
  // const provider = useProvider();
  // const { data: name } = useContractRead({
  //   address: contract,
  //   abi: ERC20,
  //   functionName: "symbol",
  // });
  //
  // if (!name) return;

  return (
    <a href="#" className="px-4 block hover:bg-gray-50">
      <div className="py-4">
        <div className="flex items-center justify-between">
          <p className="flex-grow min-w-0 truncate text-sm font-medium text-indigo-600">
            {balance.toString()}
          </p>
        </div>
      </div>
    </a>
  );
}
