import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRefreshSettings(callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen("settings-changed", () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
