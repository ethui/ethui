import type { Wallet } from "@ethui/types/wallets";
import {
  BugIcon,
  FileJsonIcon,
  KeyRoundIcon,
  UsbIcon,
  VenetianMaskIcon,
  WalletIcon,
} from "lucide-react";

export interface Props {
  name: string;
  type: Wallet["type"];
}

export function WalletView({ name, type }: Props) {
  let icon: React.ReactNode;

  switch (type) {
    case "HDWallet":
      icon = <WalletIcon className="text-highlight" />;
      break;
    case "jsonKeystore":
      icon = <FileJsonIcon className="text-highlight" />;
      break;
    case "privateKey":
      icon = <KeyRoundIcon className="text-highlight" />;
      break;
    case "plaintext":
      icon = <BugIcon className="text-dev" />;
      break;
    case "impersonator":
      icon = <VenetianMaskIcon className="text-dev" />;
      break;
    case "ledger":
      icon = <UsbIcon className="text-highlight" />;
      break;
  }

  return (
    <div className="flex items-center gap-x-2">
      {icon}
      <span>{name}</span>
    </div>
  );
}
