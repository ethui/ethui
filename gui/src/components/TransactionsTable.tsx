import type { Tx } from "@ethui/types";
import { Table } from "@ethui/ui/components/table";
import { createColumnHelper } from "@tanstack/react-table";
import { type Abi, decodeFunctionData } from "viem";
import { AddressView } from "#/components/AddressView";
import { HashView } from "#/components/HashView";
import { useInvoke } from "#/hooks/useInvoke";

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

export function TransactionsTable({
  txs,
  chainId,
}: {
  txs: Tx[];
  chainId: number;
}) {
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
          showTypeIcon={true}
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
            showTypeIcon={true}
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
