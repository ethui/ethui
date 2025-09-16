import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ethui/ui/components/shadcn/tabs";
import { Table } from "@ethui/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { Address } from "viem";
import { formatEther } from "viem";
import { AddressView } from "#/components/AddressView";
import { RouteGuard } from "#/components/RouteGuard";
import { useAddressBalance } from "#/hooks/useAddressBalance";
import { useAllAddresses } from "#/hooks/useAllAddresses";
import { useIsAnvilNetwork } from "#/hooks/useIsAnvilNetwork";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/explorer/_l/addresses/")({
  beforeLoad: () => ({ breadcrumb: "Addresses" }),
  component: Addresses,
});

function Addresses() {
  const { data: isAnvilNetwork = false, isLoading } = useIsAnvilNetwork();

  return (
    <RouteGuard
      condition={isAnvilNetwork}
      isLoading={isLoading}
      fallbackRoute="/home/account"
    >
      <AddressTable />
    </RouteGuard>
  );
}

const columnHelper = createColumnHelper<Address>();

function BalanceCell({ address }: { address: Address }) {
  const network = useNetworks((s) => s.current);
  const { balance, isLoading } = useAddressBalance(
    address,
    network?.id.chain_id || 1,
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

function AddressTable() {
  const { data: addresses } = useAllAddresses();

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

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all" className="cursor-pointer">
          All ({addresses?.all.length ?? 0})
        </TabsTrigger>
        <TabsTrigger value="eoas" className="cursor-pointer">
          EOAs ({addresses?.eoas.length ?? 0})
        </TabsTrigger>
        <TabsTrigger value="contracts" className="cursor-pointer">
          Contracts ({addresses?.contracts.length ?? 0})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-4">
        <Table
          columns={columns}
          data={addresses?.all ?? []}
          variant="secondary"
        />
      </TabsContent>
      <TabsContent value="eoas" className="mt-4">
        <Table
          columns={columns}
          data={addresses?.eoas ?? []}
          variant="secondary"
        />
      </TabsContent>
      <TabsContent value="contracts" className="mt-4">
        <Table
          columns={columns}
          data={addresses?.contracts ?? []}
          variant="secondary"
        />
      </TabsContent>
    </Tabs>
  );
}
