import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

export function useMenuAction(callback: (payload: string) => unknown) {
  useEffect(() => {
    const unlisten = getCurrentWebviewWindow().listen(
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
