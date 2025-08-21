import { createFileRoute } from "@tanstack/react-router";
import { TransactionsView } from "#/components/TransactionsView";
import { useAddressTxs } from "#/hooks/useAddressTxs";
import { useNetworks } from "#/store/useNetworks";

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
  const query = useAddressTxs(address, chainId!);

  return (
    <TransactionsView
      query={query}
      chainId={chainId!}
      emptyMessage="No transactions found"
      emptyDescription="This address has no transaction history on this network."
    />
  );
}
