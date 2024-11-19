import { createFileRoute } from "@tanstack/react-router";
import { WalletEdit } from "#/components/Settings/Wallet/edit";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/onboarding/_l/wallets/_l/$name/edit")({
  loader: ({ params }: { params: { name: string } }) =>
    useWallets.getState().wallets.find((n) => n.name === params.name),

  component: () => {
    const wallet = Route.useLoaderData();

    // TODO: can we show an error here instead?
    if (!wallet) return;

    return (
      <div className="w-full">
        <WalletEdit wallet={wallet} />
      </div>
    );
  },
});
