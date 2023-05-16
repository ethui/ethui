import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshTransactions(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("txs-updated", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
