import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshConnections(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("connections-updated", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
