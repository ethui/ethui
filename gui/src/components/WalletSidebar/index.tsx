import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarProvider,
} from "@ethui/ui/components/shadcn/sidebar";
import { useEffect, useState } from "react";
import { useNetworks } from "#/store/useNetworks";
import { useUI } from "#/store/useUI";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "../AddressView";
import { IconAddress } from "../Icons/Address";
import { SearchInput } from "../SearchInput";
import { NetworkSelector } from "./NetworkSelector";
import { useSidebarSearch } from "./useSidebarSearch";
import { WalletSelector } from "./WalletSelector";
import { cn } from "@ethui/ui/lib/utils";

export function WalletSidebar() {
  const { walletSidebar: open, setWalletSidebar: setOpen } = useUI();
  const [searchTerm, setSearchTerm] = useState("");

  const onClose = () => {
    setOpen(false);
  };

  const { wallets, networks } = useSidebarSearch(searchTerm);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      {open && <div className="fixed inset-0 z-25" onClick={onClose} />}
      <SidebarProvider
        className="fixed z-30"
        style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
        <Sidebar
          side="right"
          collapsible="offcanvas"
          className={cn("select-none", open && "shadow-2xl")}
        >
          <SidebarHeader className="border-border border-b">
            <HeaderContent />
          </SidebarHeader>
          {open && (
            <SidebarContent className="px-3 py-5">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Filter"
              />

              <SidebarGroup className="flex flex-col space-y-3">
                <WalletSelector wallets={wallets} />

                <NetworkSelector networks={networks} />
              </SidebarGroup>
            </SidebarContent>
          )}
        </Sidebar>
      </SidebarProvider>
    </>
  );
}

function HeaderContent() {
  const addr = useWallets((s) => s.address);
  const network = useNetworks((s) => s.current);

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      {network && addr && (
        <IconAddress
          chainId={network.id.chain_id}
          address={addr}
          effigy
          className="h-8 w-8"
        />
      )}
      {addr && (
        <AddressView
          className="font-bold text-sm"
          showLinkExplorer={false}
          address={addr}
        />
      )}
    </div>
  );
}
