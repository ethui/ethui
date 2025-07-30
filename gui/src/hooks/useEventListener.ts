import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

type Event =
  | "peers-updated"
  | "settings-changed"
  | "contracts-updated"
  | "txs-updated"
  | "forge-test-traces-updated";

export function useEventListener(event: Event, callback: () => unknown) {
  const view = getCurrentWebviewWindow();

  useEffect(() => {
    const unlisten = view.listen(event, callback);

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [event, callback, view.listen]);
}
