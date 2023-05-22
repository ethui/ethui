import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshWallets(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("wallets-updated", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
