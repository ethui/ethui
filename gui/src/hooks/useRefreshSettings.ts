import { useEventListenr } from "./useEventListenr";

export function useRefreshSettings(callback: () => unknown) {
  useEventListenr("settings-changed", callback);
}
