import { useEventListener } from "./useEventListener";

export function useRefreshSettings(callback: () => unknown) {
  useEventListener("settings-changed", callback);
}
