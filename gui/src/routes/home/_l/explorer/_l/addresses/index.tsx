import { Table } from "@ethui/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { Address } from "viem";
import { formatEther } from "viem";
import { AddressView } from "#/components/AddressView";
import { useAddressBalance } from "#/hooks/useAddressBalance";
import { useAllAddresses } from "#/hooks/useAllAddresses";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/explorer/_l/addresses/")({
  beforeLoad: () => ({ breadcrumb: "Addresses" }),
  component: Addresses,
});

function Addresses() {
  const { data: addresses = [] } = useAllAddresses();

  return <AddressTable addresses={addresses} />;
}

const columnHelper = createColumnHelper<Address>();

function BalanceCell({ address }: { address: Address }) {
  const network = useNetworks((s) => s.current);
  const { balance, isLoading } = useAddressBalance(
    address,
    network?.dedup_chain_id.chain_id || 1,
  );

  if (isLoading) {
    return <span className="text-muted-foreground text-sm">...</span>;
  }

  if (!balance) {
    return <span className="text-muted-foreground text-sm">0 ETH</span>;
  }

  const formatted = Number(formatEther(balance))
    .toFixed(4)
    .replace(/\.?0+$/, "");

  return <span className="text-sm">{formatted} ETH</span>;
}

function AddressTable({ addresses }: { addresses: Address[] }) {
  const columns = [
    columnHelper.display({
      id: "address",
      header: "Address",
      cell: ({ row }) => (
        <AddressView
          showTypeIcon={true}
          address={row.original}
          showAlias={true}
          className="text-sm"
        />
      ),
    }),
    columnHelper.display({
      id: "balance",
      header: "ETH Balance",
      cell: ({ row }) => <BalanceCell address={row.original} />,
    }),
  ];

  return <Table columns={columns} data={addresses} variant="secondary" />;
}
