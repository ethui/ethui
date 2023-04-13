import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import { useInvoke } from "../hooks/tauri";

interface Connection {
  origin: string;
  tab_id?: number;
  title?: string;
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
      acc.get(conn.tab_id).push(conn);

      return acc;
    }, new Map());

    setGroupedConnections(groupedConnections);
  }, [connections]);

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <ul role="list" className="divide-y divide-gray-200">
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
    <a href="#" className="px-4 block hover:bg-gray-50">
      <div className="py-4 flex items-center justify-start">
        <div className="flex flex-shrink-0">
          {conns[0].favicon && <img src={conns[0].favicon} width={25} />}{" "}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex flex-col">
            <p className="mx-2 truncate text-sm font-medium text-indigo-600">
              {conns[0].title}
            </p>
            <div className="pl-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                {tabId && (
                  <span className="text-sm text-gray-600">Tab ID {tabId}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-gray-100 text-gray-800">
            {conns.length} connections
          </span>
        </div>
      </div>
    </a>
  );
}
