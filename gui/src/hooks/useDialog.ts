import { event, invoke } from "@tauri-apps/api";
import { useCallback } from "react";
import { useParams } from "react-router-dom";

import { useInvoke } from "./tauri";

export function useDialog<T>() {
  const { dialogId } = useParams();
  const id = parseInt(dialogId!);
  const { data } = useInvoke<T>("dialog_get_payload", { id });

  const send = useCallback(
    (payload: unknown = {}) => invoke("dialog_send", { id, payload }),
    [id],
  );

  return { id, data, send, listen: event.listen };
}
