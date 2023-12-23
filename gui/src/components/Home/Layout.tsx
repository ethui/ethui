import { Box, SvgIcon, Theme } from "@mui/material";
import {
  RequestQuoteSharp,
  Receipt,
  CallToAction,
  OnlinePredictionSharp,
} from "@mui/icons-material";
import { Outlet } from "react-router-dom";
import { SnackbarProvider } from "notistack";

import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";
import { CommandBar } from "@/components";
import { useTheme } from "@/store";
import { Sidebar } from "./Sidebar";

const sidebarWidth = { md: 200, sm: 72 };

export interface Tab {
  path: string;
  label: string;
  icon: typeof SvgIcon;
}

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
