import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshPeers(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("peers-updated", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
