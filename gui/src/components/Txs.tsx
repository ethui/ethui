import { MapPinIcon, UsersIcon } from "@heroicons/react/20/solid";
import ethers from "ethers";
import useSWR from "swr";

import { useAccount, useProvider } from "../hooks";
import { useInvoke } from "../hooks/tauri";

type Call = "getTransactionReceipt";
type Args = Parameters<ethers.providers.Provider["getTransactionReceipt"]>;

function ethersFetcher<N extends [Call, Args]>(
  provider?: ethers.providers.Provider
) {
  return ([method, args]: N) => {
    if (!provider) return undefined;
    return provider[method](...args);
  };
}

function ethersBatchFetcher<N extends [Call, Args[]]>(
  provider?: ethers.providers.Provider
) {
  return ([method, args]: N) => {
    console.log(method, args);
    if (!provider) return Promise.resolve([]);
    return Promise.all(args.map((args) => provider[method](...args)));
  };
}

export function Txs() {
  const provider = useProvider();
  const account = useAccount();
  const { data: hashes } = useInvoke<string[]>("get_transactions", {
    address: account,
  });

  const { data: receipts } = useSWR(
    ["getTransactionReceipt", hashes],
    ethersBatchFetcher(provider)
  );
  console.log(receipts);

  if (!receipts) return null;

  return (
    <>
      <h1>Transactions</h1>
      <ul role="list" className="divide-y divide-gray-200">
        {receipts.map((receipt, i) => {
          if (!receipt) return <></>;

          return (
            <li key={receipt.transactionHash}>
              <a href="#" className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-indigo-600">
                      {receipt.transactionHash}
                    </p>
                    <div className="ml-2 flex flex-shrink-0">
                      <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                        {receipt.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <UsersIcon
                          className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                          aria-hidden="true"
                        />
                        {receipt.from}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:ml-6 sm:mt-0">
                        <MapPinIcon
                          className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                          aria-hidden="true"
                        />
                        {receipt.to}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>Closing on </p>
                    </div>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
