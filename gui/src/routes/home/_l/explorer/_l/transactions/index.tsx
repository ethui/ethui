import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { TransactionsView } from "#/components/TransactionsView";
import { useLatestTxs } from "#/hooks/useLatestTxs";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/home/_l/explorer/_l/transactions/")({
  beforeLoad: () => ({ breadcrumb: "Transactions" }),
  component: RouteComponent,
});

function RouteComponent() {
  const chainId = useNetworks((s) => s.current?.dedup_chain_id.chain_id);
  const currentAddress = useWallets((s) => s.address);
  const query = useLatestTxs(chainId!);

  return (
    <div className="space-y-4">
      {currentAddress && (
        <div className="flex justify-end">
          <Link
            to="/home/explorer/addresses/$address"
            params={{ address: currentAddress }}
          >
            <Button variant="outline" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              My Transactions
            </Button>
          </Link>
        </div>
      )}

      <TransactionsView
        query={query}
        chainId={chainId!}
        emptyMessage="No transactions found"
        emptyDescription="No transactions have been recorded on this network yet."
      />
    </div>
  );
}
