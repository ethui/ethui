import { useEventListenr } from "./useEventListenr";

export function useRefreshContracts(callback: () => unknown) {
  useEventListenr("contracts-updated", callback);
}
