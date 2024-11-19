import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { AppNavbar } from "#/components/AppNavbar";
import { Plaintext } from "#/components/Settings/Wallet/Plaintext";
import { HDWalletForm } from "#/components/Settings/Wallet/HDWallet";
import { JsonKeystore } from "#/components/Settings/Wallet/JsonKeystore";
import { PrivateKeyForm } from "#/components/Settings/Wallet/PrivateKey";
import { ImpersonatorForm } from "#/components/Settings/Wallet/Impersonator";
import { Ledger } from "#/components/Settings/Wallet/Ledger";

export const Route = createFileRoute("/_home/home/settings/wallets/new")({
  validateSearch: (search: Record<string, string>) => {
    // TODO: fail here
    // https://tanstack.com/router/v1/docs/framework/react/guide/search-params#zod
    return { type: search.type };
  },

  component: () => {
    const { type } = Route.useSearch();
    console.log(type);

    return (
      <>
        <AppNavbar title={`Settings » Wallets » new ${type}`} />
        <div className="m-4">
          <Content type={type} />
        </div>
      </>
    );
  },
});

function Content({ type }: { type: string }) {
  const router = useRouter();

  const onSubmit = async (params: object) => {
    await invoke("wallets_create", { params });
    router.history.back();
  };

  const onRemove = async () => {
    router.history.back();
  };

  const props = {
    onSubmit,
    onRemove,
  };

  switch (type) {
    case "plaintext":
      return <Plaintext {...props} />;
    case "HDWallet":
      return <HDWalletForm {...props} />;
    case "jsonKeystore":
      return <JsonKeystore {...props} />;
    case "impersonator":
      return <ImpersonatorForm {...props} />;
    case "privateKey":
      return <PrivateKeyForm {...props} />;
    case "ledger":
      return <Ledger {...props} />;
    default:
      return <></>;
  }
}
