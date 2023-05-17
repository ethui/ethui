import { appWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";

export function useMenuAction(callback: (payload: string) => unknown) {
  useEffect(() => {
    const unlisten = appWindow.listen(
      "go",
      ({ payload }: { payload: string }) => {
        callback(payload);
      }
    );

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [callback]);
}
