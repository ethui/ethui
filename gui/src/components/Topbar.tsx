import { ChainIcon } from "@ethui/ui/components/icons/chain";
import { Button } from "@ethui/ui/components/shadcn/button";
import { cn } from "@ethui/ui/lib/utils";
import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";

interface TopbarProps {
  onWalletClick?: () => void;
}

export function Topbar({ onWalletClick }: TopbarProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const isMacos = platform() === "macos";

  const handleBack = () => {
    router.history.back();
  };

  const handleForward = () => {
    router.history.forward();
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-20 flex h-12 items-center justify-between border-border border-b bg-sidebar px-2",
        { "pl-18": isMacos },
      )}
      data-tauri-drag-region="true"
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleForward}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

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
        showLinkExplorer={false}
        address={currentAddress}
        className="text-muted-foreground text-sm"
        clickToCopy={false}
        icon={false}
        contextMenu={false}
      />
    </Button>
  );
}
