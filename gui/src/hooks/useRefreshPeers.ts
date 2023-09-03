import { useEventListener } from "./useEventListener";

export function useRefreshPeers(callback: () => unknown) {
  useEventListener("peers-updated", callback);
}
