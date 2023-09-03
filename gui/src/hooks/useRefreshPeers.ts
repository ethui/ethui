import { useEventListenr } from "./useEventListenr";

export function useRefreshPeers(callback: () => unknown) {
  useEventListenr("peers-updated", callback);
}
