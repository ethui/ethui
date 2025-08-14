import { createFileRoute } from "@tanstack/react-router";
import { useNetworks } from "#/store/useNetworks";
import { PaginatedTx } from "@ethui/types";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Table } from "@ethui/ui/components/table";
import { AddressView } from "#/components/AddressView";
import { HashView } from "#/components/HashView";

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

  const [txs, setTxs] = useState<PaginatedTx[]>([]);

  useEffect(() => {
    const fetchTxs = async () => {
      try {
        const txs = await invoke<PaginatedTx[]>("db_get_older_transactions", {
          address,
          chainId,
          max: 20,
          lastKnown: null,
        });
        setTxs(txs);
      } catch (e) {
        setTxs([]);
      }
    };

    if (address && chainId) {
      fetchTxs();
    }
  }, [address, chainId]);

  console.log(txs);

  return <TransactionsTable txs={txs} />;
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
      cell: ({ getValue }) => (
        <AddressView
          address={getValue()}
          showAlias={true}
          showLinkExplorer={true}
          className="text-sm"
        />
      ),
    }),
  ];
  return <Table columns={columns} data={txs} variant="secondary" />;
}
