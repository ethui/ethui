import { useEventListen } from "./useEventListen";

export function useRefreshPeers(callback: () => unknown) {
  useEventListen("peers-updated", callback);
}
