import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar, CommandBarProvider } from "#/components/CommandBar";
import { SidebarProvider } from "#/components/shadcn/sidebar";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";

export const Route = createFileRoute("/_home")({
  component: HomePageLayout,
});

function HomePageLayout() {
  return (
    <CommandBarProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "15rem",
            "--sidebar-width-mobile": "10rem",
          } as any
        }
      >
        <AppSidebar />
        <main className="relative flex min-h-svh flex-1 flex-col">
          <Outlet />
          <Notifications />
        </main>
      </SidebarProvider>

      <CommandBar />
    </CommandBarProvider>
  );
}

function Notifications() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return null;
}
