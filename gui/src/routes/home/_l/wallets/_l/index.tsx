import type { Wallet } from "@ethui/types/wallets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ethui/ui/components/shadcn/dropdown-menu";
import { createFileRoute, Link } from "@tanstack/react-router";
import { startCase } from "lodash-es";
import { Pencil, Plus } from "lucide-react";
import type { Address } from "viem";
import { AddressView } from "#/components/AddressView";
import { useAddressBalance } from "#/hooks/useAddressBalance";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { formatBalance } from "#/utils";

const walletTypes: Wallet["type"][] = [
  "jsonKeystore",
  "plaintext",
  "HDWallet",
  "ledger",
  "privateKey",
  "impersonator",
];

export const Route = createFileRoute("/home/_l/wallets/_l/")({
  beforeLoad: () => ({ breadcrumb: "Wallets" }),
  component: WalletsPage,
});

function WalletsPage() {
  const allWalletInfo = useWallets((s) => s.allWalletInfo);

  if (!allWalletInfo) return null;

  return (
    <div className="flex flex-wrap justify-center gap-8">
      <AddWalletCard />
      {allWalletInfo.map((walletInfo) => (
        <WalletCard key={walletInfo.wallet.name} walletInfo={walletInfo} />
      ))}
    </div>
  );
}

function AddWalletCard() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex min-h-[180px] w-64 cursor-pointer flex-col items-center justify-center gap-3 border border-muted-foreground/50 border-dashed bg-muted/20 transition-colors hover:border-primary hover:bg-muted/40"
        >
          <Plus className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="font-medium text-muted-foreground text-sm transition-colors group-hover:text-primary">
            Add Wallet
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {walletTypes.map((walletType) => (
          <DropdownMenuItem key={walletType} asChild>
            <Link to="/home/wallets/new" search={{ type: walletType }}>
              {startCase(walletType)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface WalletCardProps {
  walletInfo: {
    wallet: Wallet;
    addresses: { address: Address; key: string }[];
  };
}

function WalletCard({ walletInfo }: WalletCardProps) {
  const { wallet, addresses } = walletInfo;
  const MAX_VISIBLE = 4;
  const visibleAddresses = addresses.slice(0, MAX_VISIBLE);
  const remainingCount = addresses.length - MAX_VISIBLE;

  return (
    <div className="w-64 border">
      <div className="flex items-center justify-between border-b bg-muted px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">{wallet.name}</div>
          <div className="text-muted-foreground text-xs">
            {startCase(wallet.type)}
          </div>
        </div>
        <Link
          to={`/home/wallets/${wallet.name}/edit`}
          className="flex-shrink-0 rounded p-1 hover:bg-accent"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      <div className="divide-y">
        {visibleAddresses.map((addr) => (
          <AddressBalanceRow key={addr.key} address={addr.address} />
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="px-3 py-2 text-center text-muted-foreground text-xs">
          +{remainingCount} more
        </div>
      )}
    </div>
  );
}

function AddressBalanceRow({ address }: { address: Address }) {
  const chainId = useNetworks((s) => s.current?.id.chain_id || 1);
  const { balance, isLoading } = useAddressBalance(address, chainId);

  const formattedBalance = isLoading
    ? "..."
    : balance
      ? formatBalance(balance)
      : "0";

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <AddressView
        address={address}
        icon
        clickToCopy={false}
        className="min-w-0 flex-1 text-xs"
      />
      <div className="whitespace-nowrap text-muted-foreground text-xs">
        {formattedBalance} ETH
      </div>
    </div>
  );
}
