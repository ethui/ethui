import { SidebarProvider } from "@ethui/ui/components/shadcn/sidebar";
import { Toaster } from "@ethui/ui/components/shadcn/toaster";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { AppNavbar } from "#/components/AppNavbar";
import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar, CommandBarProvider } from "#/components/CommandBar";
import { TopbarLayout } from "#/components/TopbarLayout";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";

export const Route = createFileRoute("/home/_l")({
  component: HomePageLayout,
});

function HomePageLayout() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return (
    <TopbarLayout>
      <CommandBarProvider>
        <SidebarProvider
          style={{ "--sidebar-width": "13em" } as React.CSSProperties}
        >
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <AppNavbar />
            <AnimatedOutlet />
            <Toaster />
          </main>
        </SidebarProvider>
        <CommandBar />
      </CommandBarProvider>
    </TopbarLayout>
  );
}
