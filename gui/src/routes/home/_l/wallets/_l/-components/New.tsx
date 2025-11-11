import { useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { HDWalletForm } from "./HDWallet";
import { ImpersonatorForm } from "./Impersonator";
import { JsonKeystore } from "./JsonKeystore";
import { Ledger } from "./Ledger";
import { Plaintext } from "./Plaintext";
import { PrivateKeyForm } from "./PrivateKey";

export function WalletNew({ type }: { type: string }) {
  const navigate = useNavigate();

  const onSubmit = async (params: object) => {
    await invoke("wallets_create", { params: { type, ...params } });
    navigate({ to: "/home/wallets" });
  };

  const onRemove = async () => {
    navigate({ to: "/home/wallets" });
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
  }
}
