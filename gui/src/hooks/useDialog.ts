import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback } from "react";

import { useInvoke } from "./tauri";

export function useDialog<T>(id: number) {
  const { data } = useInvoke<T>("dialog_get_payload", { id });

  const send = useCallback(
    (payload: unknown = {}) => invoke("dialog_send", { id, payload }),
    [id],
  );

  const accept = useCallback(
    (payload: unknown = {}) =>
      invoke("dialog_finish", { id, result: { Ok: payload } }),
    [id],
  );

  const reject = useCallback(
    (payload: unknown = {}) => {
      invoke("dialog_finish", { id, result: { Err: payload } });
    },
    [id],
  );

  return { data, send, accept, reject, listen };
}
