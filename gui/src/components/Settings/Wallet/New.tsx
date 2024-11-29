import { useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { HDWalletForm } from "#/components/Settings/Wallet/HDWallet";
import { ImpersonatorForm } from "#/components/Settings/Wallet/Impersonator";
import { JsonKeystore } from "#/components/Settings/Wallet/JsonKeystore";
import { Ledger } from "#/components/Settings/Wallet/Ledger";
import { Plaintext } from "#/components/Settings/Wallet/Plaintext";
import { PrivateKeyForm } from "#/components/Settings/Wallet/PrivateKey";

export function WalletNew({ type }: { type: string }) {
  const router = useRouter();

  const onSubmit = async (params: object) => {
    await invoke("wallets_create", { params: { type, ...params } });
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
