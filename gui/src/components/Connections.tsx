import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import { useInvoke } from "../hooks/tauri";

interface Connection {
  origin: string;
  tab_id?: number;
  socket: string;
  url: string;
  favicon: string;
}

export function Connections() {
  const { data: connections, mutate } =
    useInvoke<Connection[]>("get_connections");

  const [groupedConnections, setGroupedConnections] = useState<
    Map<number | undefined, Connection[]>
  >(new Map());

  useEffect(() => {
    const unlisten = listen("refresh-connections", () => {
      mutate();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [mutate]);

  useEffect(() => {
    if (!connections) return;
    const groupedConnections = connections.reduce((acc, conn) => {
      if (!acc.has(conn.tab_id)) {
        acc.set(conn.tab_id, []);
      }
      acc.get(conn.tab_id)!.push(conn);

      return acc;
    }, new Map());

    setGroupedConnections(groupedConnections);
  }, [connections]);

  console.log("conn", connections);

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-base font-semibold leading-6 text-gray-900">
          Connections
        </h1>
      </div>
      <ul role="list" className="px-4 divide-y divide-gray-200">
        {Array.from(groupedConnections.entries()).map(([id, conns]) => (
          <li key={id}>
            <Connection tabId={id} conns={conns} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Connection({ tabId, conns }: { tabId?: number; conns: Connection[] }) {
  return (
    <a href="#" className="block hover:bg-gray-50">
      <div className="py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-shrink-0">
            {conns[0].favicon && <img src={conns[0].favicon} width={25} />}
            <p className="ml-2 truncate text-sm font-medium text-indigo-600">
              {conns.map((conn) => conn.origin).join(", ")}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}
