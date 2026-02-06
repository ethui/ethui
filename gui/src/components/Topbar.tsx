import { ChainIcon } from "@ethui/ui/components/icons/chain";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import { cn } from "@ethui/ui/lib/utils";
import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useNetworks } from "#/store/useNetworks";
import { useUI } from "#/store/useUI";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";

export function Topbar() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const searchBar = useUI();

  const handleBack = () => {
    router.history.back();
  };

  const handleForward = () => {
    router.history.forward();
  };

  const handleSearchClick = () => {
    searchBar.toggleSearchBar();
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-20 flex h-12 items-center gap-2 border-border border-b bg-sidebar px-2",
      )}
      data-tauri-drag-region="true"
    >
      <div className="flex-1" />

      <div className="flex flex-shrink-0 items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={!canGoBack}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleForward}
          aria-label="Go forward"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Search hashes, addresses or quick actions"
          className="h-8 w-104 cursor-pointer rounded-md bg-white"
          onClick={handleSearchClick}
          readOnly
          data-tauri-drag-region="false"
          icon={<Search className="mr-4 h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="flex flex-1 justify-end" data-tauri-drag-region="true">
        <WalletButton />
      </div>
    </header>
  );
}

function WalletButton() {
  const network = useNetworks((s) => s.current);
  const [currentWallet, currentAddress] = useWallets(
    useShallow((s) => [s.currentWallet, s.address]),
  );
  const walletSidebar = useUI();

  if (!network || !currentWallet || !currentAddress) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded"
        onClick={() => walletSidebar.toggleWalletSidebar()}
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
      className="flex-shrink-0 gap-2 rounded"
      onClick={() => walletSidebar.toggleWalletSidebar()}
      data-tauri-drag-region="false"
    >
      <div className="flex-shrink-0">
        <ChainIcon chainId={network.id.chain_id} />
      </div>

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
