import type { Tx } from "@ethui/types";
import { InfiniteScroll } from "@ethui/ui/components/infinite-scroll";
import { Table } from "@ethui/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { LoaderCircle } from "lucide-react";
import { type Abi, decodeFunctionData } from "viem";
import { AddressView } from "#/components/AddressView";
import { HashView } from "#/components/HashView";
import { useAddressTxs } from "#/hooks/useAddressTxs";
import { useInvoke } from "#/hooks/useInvoke";
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

const columnHelper = createColumnHelper<Tx>();

function MethodName({ tx, chainId }: { tx: Tx; chainId: number }) {
  const { data: abi } = useInvoke<Abi>(
    "db_get_contract_impl_abi",
    {
      address: tx.to,
      chainId,
    },
    {
      enabled: !!tx.to,
    },
  );

  if (!tx.to || !tx.data || !abi) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  try {
    const decoded = decodeFunctionData({
      abi,
      data: tx.data,
    });
    return <MethodPill name={decoded.functionName} />;
  } catch {
    return <MethodPill name="Unknown" />;
  }
}

function MethodPill({ name }: { name: string }) {
  return (
    <div className="flex w-fit items-center border bg-muted p-1">
      <span className="truncate font-mono text-xs">
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </span>
    </div>
  );
}

function TransactionsTable({ txs, chainId }: { txs: Tx[]; chainId: number }) {
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
    columnHelper.display({
      id: "method",
      header: "Method",
      cell: ({ row }) => <MethodName tx={row.original} chainId={chainId} />,
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
