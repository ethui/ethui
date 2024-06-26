import { event } from "@tauri-apps/api";
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

	return { id, data, send, listen: event.listen };
}

export type Dialog<T> = ReturnType<typeof useDialog<T>>;
