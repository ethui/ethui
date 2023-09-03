import { useEventListen } from "./useEventListen";

export function useRefreshTransactions(callback: () => unknown) {
  useEventListen("txs-updated", callback);
}
