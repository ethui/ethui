import { listen } from "@tauri-apps/api/event";
import { BigNumber } from "ethers";
import { useEffect } from "react";

import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";
import { Address } from "../types";

export function Balances() {
  const address = useAccount();
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
            <Balance {...{ contract, balance }} />
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
  return (
    <a href="#" className="px-4 block hover:bg-gray-50">
      <div className="py-4">
        <div className="flex items-center justify-between">
          <p className="flex-grow min-w-0 truncate text-sm font-medium text-indigo-600">
            {contract} - {balance.toString()}
          </p>
        </div>
      </div>
    </a>
  );
}
