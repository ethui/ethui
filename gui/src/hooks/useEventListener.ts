import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

type Event =
  | "peers-updated"
  | "settings-changed"
  | "contracts-updated"
  | "txs-updated";

export function useEventListener(event: Event, callback: () => unknown) {
  const view = getCurrentWebviewWindow();

  useEffect(() => {
    const unlisten = listen(event, callback, { target: view.label });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [event, callback, view.label]);
}
