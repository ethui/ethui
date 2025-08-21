import { createFileRoute } from "@tanstack/react-router";
import { TransactionsView } from "#/components/TransactionsView";
import { useLatestTxs } from "#/hooks/useLatestTxs";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/explorer/_l/transactions/")({
  beforeLoad: () => ({ breadcrumb: "Transactions" }),
  component: RouteComponent,
});

function RouteComponent() {
  const chainId = useNetworks((s) => s.current?.dedup_chain_id.chain_id);
  const query = useLatestTxs(chainId!);

  return (
    <TransactionsView
      query={query}
      chainId={chainId!}
      emptyMessage="No transactions found"
      emptyDescription="No transactions have been recorded on this network yet."
    />
  );
}
