import { CalendarIcon, MapPinIcon, UsersIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";

import { useAccount, useProvider } from "../hooks";
import { useInvoke } from "../hooks/tauri";

const positions = [
  {
    id: 1,
    title: "Back End Developer",
    type: "Full-time",
    location: "Remote",
    department: "Engineering",
    closeDate: "2020-01-07",
    closeDateFull: "January 7, 2020",
  },
  {
    id: 2,
    title: "Front End Developer",
    type: "Full-time",
    location: "Remote",
    department: "Engineering",
    closeDate: "2020-01-07",
    closeDateFull: "January 7, 2020",
  },
  {
    id: 3,
    title: "User Interface Designer",
    type: "Full-time",
    location: "Remote",
    department: "Design",
    closeDate: "2020-01-14",
    closeDateFull: "January 14, 2020",
  },
];

export function Txs() {
  const provider = useProvider();
  const account = useAccount();
  const { data: hashes } = useInvoke<string[]>("get_transactions", {
    address: account,
  });

  const [txs, setTxs] = useState<unknown[]>([]);
  const [receipts, setReceipts] = useState<unknown[]>([]);

  useEffect(() => {
    if (!hashes) return;

    Promise.all(
      hashes.map((hash: string) => provider?.getTransaction(hash))
    ).then(setTxs);
    Promise.all(
      hashes.map((hash: string) => provider?.getTransactionReceipt(hash))
    ).then(setReceipts);
  }, [hashes, setTxs, provider]);

  console.log(txs);
  console.log(receipts);
  if (!txs) return null;

  return (
    <>
      <h1>Transactions</h1>
      <ul role="list" className="divide-y divide-gray-200">
        {txs.map((tx: unknown, i) => (
          <li key={tx.hash}>
            <a href="#" className="block hover:bg-gray-50">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-indigo-600">
                    {tx.hash}
                  </p>
                  <div className="ml-2 flex flex-shrink-0">
                    <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                      {receipts[i].status}
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
                      {tx.from}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:ml-6 sm:mt-0">
                      <MapPinIcon
                        className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                        aria-hidden="true"
                      />
                      {tx.to}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>Closing on </p>
                  </div>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
