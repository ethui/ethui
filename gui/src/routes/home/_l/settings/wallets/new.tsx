import { createFileRoute } from "@tanstack/react-router";
import { AppNavbar } from "#/components/AppNavbar";
import { WalletNew } from "#/components/Settings/Wallet/New";

export const Route = createFileRoute("/home/_l/settings/wallets/new")({
  validateSearch: (search: Record<string, string>) => {
    // TODO: fail here
    // https://tanstack.com/router/v1/docs/framework/react/guide/search-params#zod
    return {
      type: search.type,
    };
  },

  component: () => {
    const { type } = Route.useSearch();
    console.log(type);

    return (
      <>
        <AppNavbar title={`Settings » Wallets » new ${type}`} />
        <div className="m-4">
          <WalletNew type={type} />
        </div>
      </>
    );
  },
});
