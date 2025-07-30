import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

type Event =
  | "peers-updated"
  | "settings-changed"
  | "contracts-updated"
  | "txs-updated"
  | "update-ready";

type Callback = (() => unknown) | ((event: unknown) => unknown);

export function useEventListener({
  event,
  callback,
  enabled = true,
}: {
  event: Event;
  callback: Callback;
  enabled?: boolean;
}) {
  const view = getCurrentWebviewWindow();

  useEffect(() => {
    if (!enabled) return;
    const unlisten = view.listen(event, callback);

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [enabled, event, callback, view.listen]);
}
