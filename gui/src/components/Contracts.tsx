import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { useInvoke } from "../hooks/tauri";
import { Address } from "../types";

export function Contracts() {
  const { data: addresses, mutate } = useInvoke<Address[]>("get_contracts");

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
        {(addresses || []).map((address) => (
          <li key={address}>
            <Contract address={address} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Contract({ address }: { address: Address }) {
  return (
    <a href="#" className="px-4 block hover:bg-gray-50">
      <div className="py-4">
        <div className="flex items-center justify-between">
          <p className="flex-grow min-w-0 truncate text-sm font-medium text-indigo-600">
            {address}
          </p>
        </div>
      </div>
    </a>
  );
}
