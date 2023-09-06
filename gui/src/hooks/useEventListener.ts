import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

type Event =
  | "peers-updated"
  | "settings-changed"
  | "contracts-updated"
  | "txs-updated";

export function useEventListener(event: Event, callback: () => unknown) {
  useEffect(() => {
    const unlisten = listen(event, () => {
      callback();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [event, callback]);
}
