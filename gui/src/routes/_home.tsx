import { Outlet, createFileRoute } from "@tanstack/react-router";

import type { Tab } from "@ethui/types/ui";
import { CircleUser, FileCode2, ReceiptText, Wifi } from "lucide-react";
import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar, CommandBarProvider } from "#/components/CommandBar";
import { SettingsDialog } from "#/components/Settings/SettingsDialog";
import { SidebarProvider } from "#/components/shadcn/sidebar";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";

export const Route = createFileRoute("/_home")({
  component: HomePageLayout,
});

export const tabs: Tab[] = [
  {
    path: "/home/account",
    label: "Account",
    icon: <CircleUser />,
  },
  {
    path: "/home/transactions",
    label: "Transactions",
    icon: <ReceiptText />,
  },
  {
    path: "/home/contracts",
    label: "Contracts",
    icon: <FileCode2 />,
  },
  {
    path: "/home/connections",
    label: "Connections",
    icon: <Wifi />,
  },
];

export function HomePageLayout() {
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

      <SettingsDialog />
      <CommandBar />
    </CommandBarProvider>
  );
}

function Notifications() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return null;
}
