import type { Wallet } from "@ethui/types/wallets";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { startCase } from "lodash-es";
import type { Address } from "viem";
import { AddressView } from "#/components/AddressView";
import { useAddressBalance } from "#/hooks/useAddressBalance";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { formatBalance } from "#/utils";

interface Props {
  backUrl?: "/home/settings/wallets" | "/onboarding/wallets";
  editWalletBaseUrl?: "/home/settings/wallets" | "/onboarding/wallets";
}

export function SettingsWallets({
  backUrl = "/home/settings/wallets",
  editWalletBaseUrl = "/home/settings/wallets",
}: Props) {
  const allWalletInfo = useWallets((s) => s.allWalletInfo);

  if (!allWalletInfo) return null;

  return (
    <div className="flex flex-wrap justify-center gap-8">
      {allWalletInfo.map((walletInfo) => (
        <WalletCard
          key={walletInfo.wallet.name}
          walletInfo={walletInfo}
          backUrl={backUrl}
          editWalletBaseUrl={editWalletBaseUrl}
        />
      ))}
    </div>
  );
}

interface WalletCardProps {
  walletInfo: {
    wallet: Wallet;
    addresses: { address: Address; key: string }[];
  };
  backUrl: "/home/settings/wallets" | "/onboarding/wallets";
  editWalletBaseUrl: "/home/settings/wallets" | "/onboarding/wallets";
}

function WalletCard({
  walletInfo,
  backUrl,
  editWalletBaseUrl,
}: WalletCardProps) {
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
          to={`${editWalletBaseUrl}/${wallet.name}/edit`}
          search={{ backUrl }}
          className="flex-shrink-0 rounded p-1 hover:bg-accent"
        >
          <Pencil1Icon className="h-4 w-4" />
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
