import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { AppNavbar } from "#/components/AppNavbar";
import { HDWalletForm } from "#/components/Settings/Wallet/HDWallet";
import { ImpersonatorForm } from "#/components/Settings/Wallet/Impersonator";
import { JsonKeystore } from "#/components/Settings/Wallet/JsonKeystore";
import { Ledger } from "#/components/Settings/Wallet/Ledger";
import { Plaintext } from "#/components/Settings/Wallet/Plaintext";
import { PrivateKeyForm } from "#/components/Settings/Wallet/PrivateKey";
import { WalletNew } from "#/components/Settings/Wallet/new";

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
