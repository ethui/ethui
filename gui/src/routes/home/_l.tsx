import { createFileRoute } from "@tanstack/react-router";

import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar, CommandBarProvider } from "#/components/CommandBar";
import { SidebarProvider } from "#/components/shadcn/sidebar";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l")({
  component: HomePageLayout,
});

function HomePageLayout() {
  return (
    <CommandBarProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="relative flex min-h-svh flex-1 flex-col">
          <AnimatedOutlet />
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
