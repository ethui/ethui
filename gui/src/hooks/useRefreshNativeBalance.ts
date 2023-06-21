import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshNativeBalance(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("native-balance-updated", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
