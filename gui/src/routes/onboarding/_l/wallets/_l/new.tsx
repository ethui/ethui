import { createFileRoute } from "@tanstack/react-router";
import { WalletNew } from "#/components/Settings/Wallet/New";

export const Route = createFileRoute("/onboarding/_l/wallets/_l/new")({
  component: () => {
    const { type } = Route.useSearch();

    return (
      <div className="w-full">
        <WalletNew type={type} />
      </div>
    );
  },
});
