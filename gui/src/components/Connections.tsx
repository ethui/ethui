import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { useInvoke } from "../hooks/tauri";

export function Connections() {
  const { data: connections, mutate } = useInvoke<string[]>("get_connections");

  useEffect(() => {
    const unlisten = listen("refresh-connections", () => {
      mutate();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [mutate]);

  console.log("conn", connections);

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-base font-semibold leading-6 text-gray-900">
          Connections
        </h1>
      </div>
      <ul role="list" className="px-4 divide-y divide-gray-200">
        {(connections || []).map((conn) => (
          <Connection key={conn} conn={conn} />
        ))}
      </ul>
    </div>
  );
}

function Connection({ conn }: { conn: string }) {
  return (
    <li>
      <a href="#" className="block hover:bg-gray-50">
        <div className="py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-medium text-indigo-600">
              {conn}
            </p>
          </div>
        </div>
      </a>
    </li>
  );
}
