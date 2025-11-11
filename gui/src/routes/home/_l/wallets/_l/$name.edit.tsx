import { createFileRoute } from "@tanstack/react-router";
import { useWallets } from "#/store/useWallets";
import { WalletEdit } from "./-components/Edit";

export const Route = createFileRoute("/home/_l/wallets/_l/$name/edit")({
  // TODO: fetch from invoke directly
  loader: ({ params }: { params: { name: string } }) =>
    useWallets.getState().wallets.find((n) => n.name === params.name),

  component: () => {
    const wallet = Route.useLoaderData();

    // TODO: can we show an error here instead?
    if (!wallet) return;

    return <WalletEdit wallet={wallet} />;
  },
});
