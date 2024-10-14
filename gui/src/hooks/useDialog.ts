import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";

import { useInvoke } from "./useInvoke";

export function useDialog<T>(idStr: string) {
  const id = Number(idStr);
  const { data } = useInvoke<T>("dialog_get_payload", { id });

  const send = useCallback(
    (payload: unknown = {}) => invoke("dialog_send", { id, payload }),
    [id],
  );

  const view = getCurrentWebviewWindow();
  return { id, data, send, listen: view.listen };
}

export type Dialog<T> = ReturnType<typeof useDialog<T>>;
