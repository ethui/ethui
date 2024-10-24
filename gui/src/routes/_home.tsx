import {
  CallToAction,
  OnlinePredictionSharp,
  Receipt,
  RequestQuoteSharp,
} from "@mui/icons-material";
import { Box, type Theme } from "@mui/material";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SnackbarProvider } from "notistack";

import type { Tab } from "@ethui/types/ui";
import { CommandBar } from "#/components/CommandBar";
import { Sidebar } from "#/components/Home/Sidebar";
import { useNoticeAlchemyKeyMissing } from "#/hooks/useNoticeAlchemyKeyMissing";
import { useNoticeNewVersion } from "#/hooks/useNoticeNewVersion";
import { useTheme } from "#/store/useTheme";

export const Route = createFileRoute("/_home")({
  component: HomePageLayout,
});

const sidebarWidth = { md: 200, sm: 72 };

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

const contentStyle = (theme: Theme) => {
  return {
    pl: `${sidebarWidth.md}px`,
    transition: theme.transitions.create("padding-left"),
    [theme.breakpoints.down("sm")]: {
      pl: `${sidebarWidth.sm}px`,
    },
  };
};

const drawerPaperStyle = (theme: Theme) => {
  return {
    width: sidebarWidth.md,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.down("sm")]: {
      width: sidebarWidth.sm,
    },
  };
};

export function HomePageLayout() {
  const { theme } = useTheme();

  return (
    <CommandBar>
      <SnackbarProvider
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        preventDuplicate
        maxSnack={3}
        dense
      >
        <Sidebar sx={drawerPaperStyle(theme)} tabs={tabs} />
        <Box sx={contentStyle(theme)}>
          <Outlet />
        </Box>
        <Notifications />
      </SnackbarProvider>
    </CommandBar>
  );
}

function Notifications() {
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();

  return null;
}
