import { getCurrent } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

export function useMenuGoAction(callback: (payload: string) => unknown) {
  useEffect(() => {
    const unlisten = getCurrent().listen(
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
