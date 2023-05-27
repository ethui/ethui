import { invoke } from "@tauri-apps/api/tauri";

import { useInvoke } from "./tauri";

export function useDialog<T>(id: number) {
  const { data } = useInvoke<T>("dialog_get_payload", { id });

  const accept = (payload: unknown = {}) =>
    invoke("dialog_finish", { id, result: { Ok: payload } });

  const reject = (payload: unknown = {}) => {
    console.log(payload);
    invoke("dialog_finish", { id, result: { Err: payload } });
  };

  return { data, accept, reject };
}
