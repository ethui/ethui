import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@ethui/ui/components/shadcn/sidebar";

interface WalletSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function WalletSidebar({ open, onClose }: WalletSidebarProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />

      <SidebarProvider
        className="fixed top-0 right-0 z-[101] w-72"
        style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
      >
        <Sidebar side="right" className="shadow-2xl h-screen">
          <SidebarHeader className="border-b border-border p-4"></SidebarHeader>

          <SidebarContent className="p-4">
            <div className="text-muted-foreground">
              Wallet controls will go here...
            </div>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </>
  );
}
