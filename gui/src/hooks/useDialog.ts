import { invoke } from "@tauri-apps/api/core";
import type { EventCallback, EventName } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback } from "react";

import { useInvoke } from "./useInvoke";

export function useDialog<T>(idStr: string) {
  const view = getCurrentWebviewWindow();
  const id = Number(idStr);
  const { data } = useInvoke<T>("dialog_get_payload", { id });

  const send = useCallback(
    (payload: unknown = {}) =>
      invoke("dialog_send", { id, payload }).catch((err) =>
        console.warn("Failed to send dialog payload", err),
      ),
    [id],
  );

  return {
    id,
    data,
    send,
    // can't delegate `view.listen` directly because it needs to be bound to `view` as `this`
    listen: <T>(event: EventName, payload: EventCallback<T>) =>
      view.listen(event, payload),
  };
}

export type Dialog<T> = ReturnType<typeof useDialog<T>>;
