import { createFileRoute } from "@tanstack/react-router";
import { useNetworks } from "#/store/useNetworks";
import { PaginatedTx } from "@ethui/types";
import { invoke } from "@tauri-apps/api/core";
import { createColumnHelper } from "@tanstack/react-table";
import { Table } from "@ethui/ui/components/table";
import { AddressView } from "#/components/AddressView";
import { HashView } from "#/components/HashView";
import { useInfiniteQuery } from "@tanstack/react-query";
import { InfiniteScroll } from "@ethui/ui/components/infinite-scroll";
import { LoaderCircle } from "lucide-react";

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

const pageSize = 20;

function RouteComponent() {
  const { address } = Route.useParams();
  const chainId = useNetworks((s) => s.current?.dedup_chain_id.chain_id);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["address-transactions", address, chainId],
      queryFn: async ({ pageParam }) => {
        const txs = await invoke<PaginatedTx[]>("db_get_older_transactions", {
          address,
          chainId,
          max: pageSize,
          lastKnown: pageParam,
        });
        return txs;
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.length < pageSize) {
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
      enabled: !!(address && chainId),
      initialPageParam: null as {
        blockNumber: number;
        position: number;
      } | null,
    });

  const allTxs = data?.pages?.flat() ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <TransactionsTable txs={allTxs} />
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
const columnHelper = createColumnHelper<PaginatedTx>();

function TransactionsTable({ txs }: { txs: PaginatedTx[] }) {
  const columns = [
    columnHelper.accessor("hash", {
      header: "Transaction Hash",
      cell: ({ getValue }) => (
        <HashView hash={getValue()} showLinkExplorer={true} />
      ),
    }),
    columnHelper.accessor("blockNumber", {
      header: "Block",
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor("from", {
      header: "From",
      cell: ({ getValue }) => (
        <AddressView
          address={getValue()}
          showAlias={true}
          showLinkExplorer={true}
          className="text-sm"
        />
      ),
    }),
    columnHelper.accessor("to", {
      header: "To",
      cell: ({ getValue }) => {
        const to = getValue();
        return to ? (
          <AddressView
            address={to}
            showAlias={true}
            showLinkExplorer={true}
            className="text-sm"
          />
        ) : (
          <span className="text-muted-foreground text-sm">Contract Deploy</span>
        );
      },
    }),
  ];
  return <Table columns={columns} data={txs} variant="secondary" />;
}
