import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { TransactionsTable } from "#/components/TransactionsTable";
import { useLatestTxs } from "#/hooks/useLatestTxs";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/explorer/_l/transactions/")({
  beforeLoad: () => ({ breadcrumb: "Transactions" }),
  component: Transactions,
});

function Transactions() {
  const chainId = useNetworks((s) => s.current?.dedup_chain_id.chain_id);
  const { data: txs, isLoading } = useLatestTxs(chainId!);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (!txs || txs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <TransactionsTable txs={txs} chainId={chainId!} />
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
        No transactions have been recorded on this network yet.
      </div>
    </div>
  );
}
