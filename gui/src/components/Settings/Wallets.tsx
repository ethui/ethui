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
import { useWallets } from "#/store/useWallets";
import { Link } from "@tanstack/react-router";

export function SettingsWallets() {
  const wallets = useWallets((s) => s.wallets);

  if (!wallets) return null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {wallets.map(({ type, name }) => (
            <Link
              href={`/home/settings/wallets/${name}/edit`}
              key={name}
              className="border p-4 hover:bg-accent"
            >
              {name} {type}
            </Link>
          ))}

          <AddWalletButton />
        </div>
      </div>
    </>
  );
}

const AddWalletButton = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="add-wallet-btn"
          className="flex text-md h-fit border p-4 bg-inherit text-primary hover:bg-accent"
        >
          <CaretDownIcon />
          Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {walletTypes.map((walletType: Wallet["type"]) => (
          <DropdownMenuItem key={walletType} asChild>
            <Link to="/home/settings/wallets/new" search={{ type: walletType }}>
              {startCase(walletType)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
