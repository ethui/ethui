import { useEventListener } from "./useEventListener";

export function useRefreshTransactions(callback: () => unknown) {
  useEventListener("txs-updated", callback);
}
