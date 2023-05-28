import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";

import { useInvoke } from "./tauri";

export function useDialog<T>(id: number) {
  const { data } = useInvoke<T>("dialog_get_payload", { id });

  const send = (payload: unknown = {}) =>
    invoke("dialog_send", { id, payload });

  const accept = (payload: unknown = {}) =>
    invoke("dialog_finish", { id, result: { Ok: payload } });

  const reject = (payload: unknown = {}) => {
    invoke("dialog_finish", { id, result: { Err: payload } });
  };

  return { data, send, accept, reject, listen };
}
