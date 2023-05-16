import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshNetwork(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("network-changed", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
