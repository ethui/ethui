import type { Wallet } from "@ethui/types/wallets";
import { useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { HDWalletForm } from "./HDWallet";
import { ImpersonatorForm } from "./Impersonator";
import { JsonKeystore } from "./JsonKeystore";
import { Ledger } from "./Ledger";
import { Plaintext } from "./Plaintext";
import { PrivateKeyForm } from "./PrivateKey";

export function WalletEdit({ wallet }: { wallet: Wallet }) {
  const navigate = useNavigate();

  const onSubmit = async (params: object) => {
    await invoke("wallets_update", { name: wallet.name, params });
    navigate({ to: "/home/wallets" });
  };

  const onRemove = async () => {
    invoke("wallets_remove", { name: wallet.name });
    navigate({ to: "/home/wallets" });
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
