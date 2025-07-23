import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarProvider,
} from "@ethui/ui/components/shadcn/sidebar";
import { QuickWalletSelect } from "./QuickWalletSelect";
import { QuickAddressSelect } from "./QuickAddressSelect";
import { QuickFastModeToggle } from "./QuickFastModeToggle";
import { QuickNetworkSelect } from "./QuickNetworkSelect";
import { useEffect } from "react";
import { IconAddress } from "./Icons/Address";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { AddressView } from "./AddressView";
import { QuickStatusSelect } from "./QuickStatusSelect";

interface WalletSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function WalletSidebar({ open, onClose }: WalletSidebarProps) {
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
        style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
        <Sidebar
          side="right"
          collapsible="offcanvas"
          className="select-none shadow-2xl"
        >
          <SidebarHeader className="border-b border-border">
            <HeaderContent />
          </SidebarHeader>

          <SidebarContent className="p-4">
            {/* <QuickStatusSelect /> */}
            <SidebarGroup>
              <div className="flex flex-col gap-y-2">
                <div className="text-xs">Wallet</div>
                <QuickWalletSelect />
                <QuickAddressSelect />
              </div>
            </SidebarGroup>
            <SidebarGroup>
              <div className="flex flex-col gap-y-2">
                <div className="text-xs">Network</div>
                <QuickNetworkSelect />
              </div>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </>
  );
}

function HeaderContent() {
  const addr = useWallets((s) => s.address);
  const network = useNetworks((s) => s.current);

  return (
    <div className="flex flex-col items-center  gap-3 pt-4">
      {network && addr && (
        <IconAddress
          chainId={network.dedup_chain_id.chain_id}
          address={addr}
          effigy
          className="h-8 w-8"
        />
      )}
      {addr && <AddressView address={addr} />}
    </div>
  );
}
