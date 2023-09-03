import { useEventListen } from "./useEventListen";

export function useRefreshContracts(callback: () => unknown) {
  useEventListen("contracts-updated", callback);
}
