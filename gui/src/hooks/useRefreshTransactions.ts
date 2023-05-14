import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshTransactions(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("refresh-transactions", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
