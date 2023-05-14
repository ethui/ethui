import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshConnections(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("refresh-connections", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
