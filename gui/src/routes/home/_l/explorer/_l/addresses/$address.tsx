import { InfiniteScroll } from "@ethui/ui/components/infinite-scroll";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { TransactionsTable } from "#/components/TransactionsTable";
import { useAddressTxs } from "#/hooks/useAddressTxs";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/explorer/_l/addresses/$address")(
  {
    beforeLoad: ({ params }) => {
      return {
        breadcrumb: params.address,
      };
    },
    component: RouteComponent,
  },
);

function RouteComponent() {
  const { address } = Route.useParams();
  const chainId = useNetworks((s) => s.current?.dedup_chain_id.chain_id);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAddressTxs(address, chainId!);

  const allTxs = data?.pages?.flat() ?? [];

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (allTxs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <TransactionsTable txs={allTxs} chainId={chainId!} />
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

function EmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-center">
      <div className="mb-2 text-lg text-muted-foreground">
        No transactions found
      </div>
      <div className="text-muted-foreground text-sm">
        This address has no transaction history on this network.
      </div>
    </div>
  );
}
