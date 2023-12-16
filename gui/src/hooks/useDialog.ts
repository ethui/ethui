import { event, invoke } from "@tauri-apps/api";
import { useCallback } from "react";

import { useInvoke } from "./tauri";

export function useDialog<T>(id: number) {
  const { data } = useInvoke<T>("dialog_get_payload", { id });

  const send = useCallback(
    (payload: unknown = {}) => invoke("dialog_send", { id, payload }),
    [id],
  );

  return { data, send, listen: event.listen };
}
