import {
  ArrowRightIcon,
  MapPinIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";
import classnames from "classnames";
import { formatEther } from "ethers/lib/utils";
import useSWR from "swr";
import truncateEthAddress from "truncate-eth-address";

import { useAccount, useProvider } from "../hooks";
import { useInvoke } from "../hooks/tauri";

export function Txs() {
  const account = useAccount();
  const { data: hashes } = useInvoke<string[]>("get_transactions", {
    address: account,
  });

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-base font-semibold leading-6 text-gray-900">
          Transaction History
        </h1>
      </div>
      <ul role="list" className="divide-y divide-gray-200">
        {(hashes || []).map((hash) => (
          <Receipt key={hash} hash={hash} />
        ))}
      </ul>
    </div>
  );
}

function Receipt({ hash }: { hash: string }) {
  const provider = useProvider();
  const { data: tx } = useSWR(["getTransaction", hash], ([, hash]) =>
    provider?.getTransaction(hash)
  );
  const { data: receipt } = useSWR(
    ["getTransactionReceipt", hash],
    ([, hash]) => provider?.getTransactionReceipt(hash)
  );

  if (!receipt || !tx) return null;

  return (
    <li>
      <a href="#" className="block hover:bg-gray-50">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-medium text-indigo-600">
              {hash}
            </p>
            <div className="ml-2 flex flex-shrink-0">
              <Status status={receipt.status} />
            </div>
          </div>
          <div className="mt-2 sm:flex sm:justify-between">
            <div className="sm:flex">
              <p className="flex items-center text-sm text-gray-500">
                {truncateEthAddress(receipt.from)}
                <ArrowRightIcon
                  className="h-5 w-5 text-gray-400 sm:mx-2"
                  aria-hidden="true"
                />
                {truncateEthAddress(receipt.to)}
              </p>
              <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 ml-5">
                {formatEther(tx.value)} Ξ
              </p>
            </div>
          </div>
        </div>
      </a>
    </li>
  );
}

function Status({ status }: { status?: number }) {
  return (
    <span
      className={classnames(
        "inline-flex rounded-full px-2 text-xs font-semibold leading-5",
        {
          "bg-green-100 text-green-800": status == 1,
          "bg-red-100 text-red-800": status == 0,
        }
      )}
    >
      {status == 1 ? "Success" : "Failed"}
    </span>
  );
}
