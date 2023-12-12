import { window as tauriWindow } from "@tauri-apps/api";
import { useEffect } from "react";

export function useMenuGoAction(callback: (payload: string) => unknown) {
  useEffect(() => {
    const unlisten = tauriWindow.appWindow.listen(
      "go",
      ({ payload }: { payload: string }) => {
        callback(payload);
      },
    );

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
