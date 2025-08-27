import { Table } from "@ethui/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { Address } from "viem";
import { AddressView } from "#/components/AddressView";
import { useAllAddresses } from "#/hooks/useAllAddresses";

export const Route = createFileRoute("/home/_l/explorer/_l/addresses/")({
  beforeLoad: () => ({ breadcrumb: "Addresses" }),
  component: Addresses,
});

function Addresses() {
  const { data: addresses = [] } = useAllAddresses();

  return <AddressTable addresses={addresses} />;
}

const columnHelper = createColumnHelper<Address>();

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
          showLinkExplorer={true}
          className="text-sm"
        />
      ),
    }),
  ];

  return <Table columns={columns} data={addresses} variant="secondary" />;
}
