import { useEventListener } from "./useEventListener";

export function useRefreshContracts(callback: () => unknown) {
  useEventListener("contracts-updated", callback);
}
