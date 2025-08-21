import type { Tx } from "@ethui/types";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

const PAGE_SIZE = 50;

export function useLatestTxs(chainId: number) {
  return useQuery({
    queryKey: ["latest-transactions", chainId],
    queryFn: async () => {
      const txs = await invoke<Tx[]>("db_get_latest_transactions", {
        chainId,
        max: PAGE_SIZE,
      });
      return txs;
    },
    enabled: !!chainId,
  });
}
