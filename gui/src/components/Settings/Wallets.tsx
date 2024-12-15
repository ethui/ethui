import { startCase } from "lodash-es";

import { type Wallet, walletTypes } from "@ethui/types/wallets";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ethui/ui/components/shadcn/dropdown-menu";
import { CaretDownIcon } from "@radix-ui//react-icons";
import { Link } from "@tanstack/react-router";
import { WalletView } from "#/components/WalletView";
import { useWallets } from "#/store/useWallets";

interface Props {
  backUrl?: "/home/settings/wallets" | "/onboarding/wallets";
  newWalletUrl?: "/home/settings/wallets/new" | "/onboarding/wallets/new";
  editWalletBaseUrl?: "/home/settings/wallets" | "/onboarding/wallets";
}

export function SettingsWallets({
  backUrl = "/home/settings/wallets",
  newWalletUrl = "/home/settings/wallets/new",
  editWalletBaseUrl = "/home/settings/wallets",
}: Props) {
  const wallets = useWallets((s) => s.wallets);

  if (!wallets) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {wallets.map(({ type, name }) => (
        <Link
          to={`${editWalletBaseUrl}/${name}/edit`}
          search={{ backUrl }}
          key={name}
          className="border p-4 hover:bg-accent"
        >
          <WalletView name={name} type={type} />
        </Link>
      ))}

      <AddWalletButton backUrl={backUrl} newWalletUrl={newWalletUrl} />
    </div>
  );
}

interface AddWalletButtonProps {
  backUrl: "/home/settings/wallets" | "/onboarding/wallets";
  newWalletUrl: "/home/settings/wallets/new" | "/onboarding/wallets/new";
}

function AddWalletButton({ backUrl, newWalletUrl }: AddWalletButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="add-wallet-btn"
          className="flex h-fit border bg-inherit p-4 text-md text-primary hover:bg-accent"
        >
          <CaretDownIcon />
          Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {walletTypes.map((walletType: Wallet["type"]) => (
          <DropdownMenuItem key={walletType} asChild>
            <Link to={newWalletUrl} search={{ type: walletType, backUrl }}>
              {startCase(walletType)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
