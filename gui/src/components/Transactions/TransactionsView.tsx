import type { Tx } from "@ethui/types";
import { InfiniteScroll } from "@ethui/ui/components/infinite-scroll";
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { EmptyState } from "#/components/EmptyState";
import { TransactionsTable } from "#/components/Transactions/TransactionsTable";

interface TransactionsViewProps {
  query: UseInfiniteQueryResult<InfiniteData<Tx[], unknown>, Error>;
  chainId: number;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function TransactionsView({
  query,
  chainId,
  emptyMessage = "No transactions found",
  emptyDescription = "No transactions have been recorded yet.",
}: TransactionsViewProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    query;
  const txs = data?.pages.flat() ?? [];

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (txs.length === 0) {
    return <EmptyState message={emptyMessage} description={emptyDescription} />;
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <TransactionsTable txs={txs} chainId={chainId} />
      <InfiniteScroll
        next={() => fetchNextPage()}
        isLoading={isFetchingNextPage}
        hasMore={!!hasNextPage}
        threshold={0.5}
      >
        {hasNextPage && <LoaderCircle className="animate-spin" />}
      </InfiniteScroll>
    </div>
  );
}
