import { SidebarProvider } from "@ethui/ui/components/shadcn/sidebar";
import { Toaster } from "@ethui/ui/components/shadcn/toaster";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { AppNavbar } from "#/components/AppNavbar";
import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar, CommandBarProvider } from "#/components/CommandBar";
import { Topbar } from "#/components/TopbarLayout";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";
import { WalletSidebar } from "#/components/WalletSidebar";

export const Route = createFileRoute("/home/_l")({
  component: HomePageLayout,
});

function HomePageLayout() {
  const [isWalletSidebarOpen, setIsWalletSidebarOpen] = useState(false);

  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return (
    <>
      <CommandBarProvider>
        <Topbar onWalletClick={() => setIsWalletSidebarOpen(true)} />
        <SidebarProvider
          style={{ "--sidebar-width": "13em" } as React.CSSProperties}
        >
          <AppSidebar />
          <main className="relative flex flex-1 flex-col mt-12">
            <AppNavbar />
            <AnimatedOutlet />
            <Toaster />
          </main>
        </SidebarProvider>
        <CommandBar />
      </CommandBarProvider>

      <WalletSidebar
        open={isWalletSidebarOpen}
        onClose={() => setIsWalletSidebarOpen(false)}
      />
    </>
  );
}
