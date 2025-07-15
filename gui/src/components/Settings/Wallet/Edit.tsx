import type { Wallet } from "@ethui/types/wallets";
import { useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { HDWalletForm } from "#/components/Settings/Wallet/HDWallet";
import { ImpersonatorForm } from "#/components/Settings/Wallet/Impersonator";
import { JsonKeystore } from "#/components/Settings/Wallet/JsonKeystore";
import { Ledger } from "#/components/Settings/Wallet/Ledger";
import { Plaintext } from "#/components/Settings/Wallet/Plaintext";
import { PrivateKeyForm } from "#/components/Settings/Wallet/PrivateKey";

export function WalletEdit({ wallet }: { wallet: Wallet }) {
  const router = useRouter();

  const onSubmit = async (params: object) => {
    await invoke("wallets_update", { name: wallet.name, params });
    router.history.back();
  };

  const onRemove = async () => {
    invoke("wallets_remove", { name: wallet.name });
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
  }
}
