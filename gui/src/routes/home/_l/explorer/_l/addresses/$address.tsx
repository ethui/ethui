import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCode2 } from "lucide-react";
import { type Address, formatEther } from "viem";
import { TransactionsView } from "#/components/Transactions/TransactionsView";
import { useAddressBalance } from "#/hooks/useAddressBalance";
import { useAddressTxs } from "#/hooks/useAddressTxs";
import { useIsContract } from "#/hooks/useIsContract";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/explorer/_l/addresses/$address")(
  {
    beforeLoad: ({ params }) => {
      return {
        breadcrumb: { type: "address", value: params.address },
      };
    },
    component: RouteComponent,
  },
);

function RouteComponent() {
  const { address } = Route.useParams();
  const chainId = useNetworks((s) => s.current?.dedup_chain_id.chain_id);
  const query = useAddressTxs(address, chainId!);
  const { isContract } = useIsContract(address, chainId!);
  const { balance } = useAddressBalance(address, chainId!);

  return (
    <div className="space-y-4">
      <Header
        balance={balance}
        isContract={isContract}
        address={address}
        chainId={chainId!}
      />

      <TransactionsView
        query={query}
        chainId={chainId!}
        emptyMessage="No transactions found"
        emptyDescription="This address has no transaction history on this network."
      />
    </div>
  );
}

function Header({
  balance,
  isContract,
  address,
  chainId,
}: {
  balance?: bigint;
  isContract: boolean;
  address: Address;
  chainId: number;
}) {
  return (
    <div className="flex items-center justify-between">
      {balance !== undefined && (
        <span className="text-muted-foreground text-sm">
          ETH balance: {formatEther(balance)}
        </span>
      )}

      {isContract && (
        <Link
          to="/home/contracts/$chainId/$address"
          params={{ chainId: chainId!, address }}
        >
          <Button variant="outline" size="sm" className="gap-2">
            <FileCode2 className="h-4 w-4" />
            View Contract
          </Button>
        </Link>
      )}
    </div>
  );
}
