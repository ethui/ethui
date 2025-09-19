import type { Tx } from "@ethui/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

const PAGE_SIZE = 20;

export function useLatestTxs(chainId: number) {
  return useInfiniteQuery({
    queryKey: ["latest-transactions", chainId],
    queryFn: async ({ pageParam }) => {
      const txs = await invoke<Tx[]>("db_get_latest_transactions", {
        chainId,
        max: PAGE_SIZE,
        lastKnown: pageParam,
      });
      return txs;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      const lastTx = lastPage.at(-1);
      if (
        lastTx &&
        lastTx.blockNumber !== undefined &&
        lastTx.position !== undefined
      ) {
        return {
          blockNumber: lastTx.blockNumber,
          position: lastTx.position,
        };
      }
      return undefined;
    },
    enabled: !!chainId,
    initialPageParam: null as {
      blockNumber: number;
      position: number;
    } | null,
  });
}
