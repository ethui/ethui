import { createFileRoute } from "@tanstack/react-router";
import { WalletNew } from "#/components/Settings/Wallet/New";

export const Route = createFileRoute("/home/_l/wallets/_l/new")({
  beforeLoad: () => ({ breadcrumb: "New" }),
  validateSearch: (search: Record<string, string>) => {
    // TODO: fail here
    // https://tanstack.com/router/v1/docs/framework/react/guide/search-params#zod
    return {
      type: search.type,
    };
  },

  component: () => {
    const { type } = Route.useSearch();

    return <WalletNew type={type} />;
  },
});
