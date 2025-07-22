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

interface WalletSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function WalletSidebar({ open, onClose }: WalletSidebarProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-25" onClick={onClose} />

      <SidebarProvider
        className="fixed z-30"
        style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
      >
        <Sidebar side="right" className="select-none shadow-2xl">
          <SidebarHeader className="border-b border-border p-4"></SidebarHeader>

          <SidebarContent className="p-4">
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
                <QuickFastModeToggle />
              </div>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </>
  );
}
