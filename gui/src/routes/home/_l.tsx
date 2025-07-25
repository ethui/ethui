import { SidebarProvider } from "@ethui/ui/components/shadcn/sidebar";
import { Toaster } from "@ethui/ui/components/shadcn/toaster";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { AppNavbar } from "#/components/AppNavbar";
import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar, CommandBarProvider } from "#/components/CommandBar";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";

export const Route = createFileRoute("/home/_l")({
  component: HomePageLayout,
});

function HomePageLayout() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return (
    <CommandBarProvider>
      <SidebarProvider
        style={{ "--sidebar-width": "13em" } as React.CSSProperties}
      >
        <AppSidebar />
        <main className="relative flex min-h-svh flex-1 flex-col">
          <AppNavbar />
          <AnimatedOutlet />
          <Toaster />
        </main>
      </SidebarProvider>

      <CommandBar />
    </CommandBarProvider>
  );
}
