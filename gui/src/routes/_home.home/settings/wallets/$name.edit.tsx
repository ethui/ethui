import { type Network, networkSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useForm } from "react-hook-form";
import { AppNavbar } from "#/components/AppNavbar";
import { useWallets } from "#/store/useWallets";
import { Wallet } from "@ethui/types/wallets";
import { Plaintext } from "#/components/Settings/Wallet/Plaintext";
import { HDWalletForm } from "#/components/Settings/Wallet/HDWallet";
import { JsonKeystore } from "#/components/Settings/Wallet/JsonKeystore";
import { PrivateKeyForm } from "#/components/Settings/Wallet/PrivateKey";
import { ImpersonatorForm } from "#/components/Settings/Wallet/Impersonator";
import { Ledger } from "#/components/Settings/Wallet/Ledger";

export const Route = createFileRoute("/_home/home/settings/wallets/$name/edit")(
  {
    // TODO: fetch from invoke directly
    loader: ({ params }: { params: { name: string } }) =>
      useWallets.getState().wallets.find((n) => n.name === params.name),

    component: () => {
      const wallet = Route.useLoaderData();

      // TODO: can we show an error here instead?
      if (!wallet) return;

      return (
        <>
          <AppNavbar title={`Settings » Wallets » ${wallet.name}`} />
          <div className="m-4">
            <Content wallet={wallet} />
          </div>
        </>
      );
    },
  },
);

function Content({ wallet }: { wallet: Wallet }) {
  const router = useRouter();

  const onSubmit = async (params: object) => {
    await invoke("wallets_update", { name: wallet.name, params });
    router.history.back();
  };

  const onRemove = async () => {
    invoke("networks_remove", { name: wallet.name });
    router.history.back();
  };

  const props = {
    onSubmit,
    onRemove,
  };

  switch (wallet.type) {
    case "plaintext":
      return <Plaintext {...props} wallet={wallet} />;
    case "HDWallet":
      return <HDWalletForm {...props} wallet={wallet} />;
    case "jsonKeystore":
      return <JsonKeystore {...props} wallet={wallet} />;
    case "impersonator":
      return <ImpersonatorForm {...props} wallet={wallet} />;
    case "privateKey":
      return <PrivateKeyForm {...props} wallet={wallet} />;
    case "ledger":
      return <Ledger {...props} wallet={wallet} />;
    default:
      return <></>;
  }
}
