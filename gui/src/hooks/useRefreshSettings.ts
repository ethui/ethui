import { useEventListen } from "./useEventListen";

export function useRefreshSettings(callback: () => unknown) {
  useEventListen("settings-changed", callback);
}
