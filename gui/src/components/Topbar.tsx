import { ChainIcon } from "@ethui/ui/components/icons/chain";
import { Button } from "@ethui/ui/components/shadcn/button";
import { useShallow } from "zustand/shallow";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";

interface TopbarProps {
  onWalletClick?: () => void;
}

export function Topbar({ onWalletClick }: TopbarProps) {
  return (
    <header
      className="fixed top-0 right-0 left-0 z-20 flex h-12 items-center justify-end border-border border-b bg-sidebar px-3"
      data-tauri-drag-region="true"
    >
      <WalletButton onClick={onWalletClick} />
    </header>
  );
}

interface WalletButtonProps {
  onClick?: () => void;
}

function WalletButton({ onClick }: WalletButtonProps) {
  const network = useNetworks((s) => s.current);
  const [currentWallet, currentAddress] = useWallets(
    useShallow((s) => [s.currentWallet, s.address]),
  );

  if (!network || !currentWallet || !currentAddress) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded"
        onClick={onClick}
        data-tauri-drag-region="false"
      >
        Wallet
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 rounded"
      onClick={onClick}
      data-tauri-drag-region="false"
    >
      <ChainIcon chainId={network.dedup_chain_id.chain_id} />

      <span className="text-sm">{currentWallet.name}</span>
      <AddressView
        address={currentAddress}
        className="text-muted-foreground text-sm"
        iconClassName="h-4 w-4"
        clickToCopy={false}
        icon={false}
        contextMenu={false}
      />
    </Button>
  );
}
