import { Table } from "@ethui/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { AddressView } from "#/components/AddressView";
import { type AddressInfo, useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/home/_l/explorer/_l/addresses/")({
  beforeLoad: () => ({ breadcrumb: "Addresses" }),
  component: Addresses,
});

function Addresses() {
  const walletInfo = useWallets((s) => s.allWalletInfo);

  const addresses = walletInfo?.[0].addresses;

  return <AddressTable addresses={addresses ?? []} />;
}

const columnHelper = createColumnHelper<AddressInfo>();

function AddressTable({ addresses }: { addresses: AddressInfo[] }) {
  const columns = [
    columnHelper.accessor("address", {
      header: "Address",
      cell: ({ getValue }) => (
        <AddressView
          address={getValue()}
          showAlias={false}
          showLinkExplorer={true}
          className="text-sm"
        />
      ),
    }),
    columnHelper.accessor("alias", {
      header: "Alias",
      cell: ({ getValue }) => getValue() || "-",
    }),
    columnHelper.accessor("walletName", {
      header: "Wallet",
      cell: ({ getValue }) => getValue() || "-",
    }),
  ];

  return (
    <Table
      className="mt-10"
      columns={columns}
      data={addresses}
      variant="secondary"
    />
  );
}
