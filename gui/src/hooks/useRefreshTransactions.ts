import { useEventListenr } from "./useEventListenr";

export function useRefreshTransactions(callback: () => unknown) {
  useEventListenr("txs-updated", callback);
}
