import { SidebarProvider } from "@ethui/ui/components/shadcn/sidebar";
import { Toaster } from "@ethui/ui/components/shadcn/toaster";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { AppNavbar } from "#/components/AppNavbar";
import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar, CommandBarProvider } from "#/components/CommandBar";
import { TopbarLayout } from "#/components/TopbarLayout";
import { WalletSidebar } from "#/components/WalletSidebar";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";

export const Route = createFileRoute("/home/_l")({
  component: HomePageLayout,
});

function HomePageLayout() {
  const [isWalletSidebarOpen, setIsWalletSidebarOpen] = useState(false);

  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return (
    // <main className="flex flex-col flex-1 min-h-screen overflow-hidden">
    //   <TopbarLayout>
    <CommandBarProvider>
      <div className="flex flex-col flex-1">
        <header
          className="fixed top-0 right-0 left-0 z-50 flex h-12 items-center border-border border-b bg-sidebar px-10"
          data-tauri-drag-region="true"
        />{" "}
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
      </div>
      <CommandBar />
    </CommandBarProvider>
    //   </TopbarLayout>

    //   <WalletSidebar
    //     open={isWalletSidebarOpen}
    //     onClose={() => setIsWalletSidebarOpen(false)}
    //   />
    // </main>
  );
}
