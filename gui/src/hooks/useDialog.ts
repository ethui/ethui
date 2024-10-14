import { listen } from "@tauri-apps/api/event";
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
  console.log("listening");
  console.log(view);
  view.listen<unknown>("simulation-result", (e: any) => console.log(e));
  listen<unknown>("simulation-result", (e: any) => console.log(e), {
    target: view.label,
  });

  listen("simulation-result", (e) => console.log(e), {
    target: "dialog/483391759",
  });
  return { id, data, send, listen: listen };
}

export type Dialog<T> = ReturnType<typeof useDialog<T>>;
