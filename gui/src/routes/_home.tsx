import {
  CallToAction,
  OnlinePredictionSharp,
  Receipt,
  RequestQuoteSharp,
} from "@mui/icons-material";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import type { Tab } from "@ethui/types/ui";
import { AppSidebar } from "#/components/AppSidebar";
import { CommandBar } from "#/components/CommandBar";
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
    icon: RequestQuoteSharp,
  },
  {
    path: "/home/transactions",
    label: "Transactions",
    icon: Receipt,
  },
  {
    path: "/home/contracts",
    label: "Contracts",
    icon: CallToAction,
  },
  {
    path: "/home/connections",
    label: "Connections",
    icon: OnlinePredictionSharp,
  },
];

export function HomePageLayout() {
  return (
    <CommandBar>
      <SidebarProvider
        style={{
          "--sidebar-width": "15rem",
          "--sidebar-width-mobile": "10rem",
        }}
      >
        <AppSidebar />
        <main className="relative flex min-h-svh flex-1 flex-col">
          <Outlet />
          <Notifications />
        </main>
      </SidebarProvider>

      <SettingsDialog />
    </CommandBar>
  );
}

function Notifications() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return null;
}
