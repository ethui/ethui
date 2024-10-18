import {
  CallToAction,
  OnlinePredictionSharp,
  Receipt,
  RequestQuoteSharp,
} from "@mui/icons-material";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import HomeLayout from "#/components/home-layout/home-layout";

import type { Tab } from "@ethui/types/ui";
import { CommandBar } from "#/components/CommandBar";
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
      <HomeLayout>
        <Outlet />
        <Notifications />
      </HomeLayout>
    </CommandBar>
  );
}

function Notifications() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return null;
}
