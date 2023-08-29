import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshContracts(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("contracts-updated", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
