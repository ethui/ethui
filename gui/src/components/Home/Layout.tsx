import { Route, Switch } from "wouter";
import { Box, Stack, SvgIcon, Theme } from "@mui/material";
import {
  RequestQuoteSharp,
  Receipt,
  CallToAction,
  OnlinePredictionSharp,
} from "@mui/icons-material";
import { createElement } from "react";

import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";
import {
  Account,
  AddressView,
  Connections,
  Contracts,
  NestedRoutes,
  Txs,
} from "@/components";
import { useTheme, useWallets } from "@/store";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

const sidebarWidth = { md: 200, sm: 72 };

export interface Tab {
  path: string;
  label: string;
  component: React.FC;
  icon: typeof SvgIcon;
  navbarComponent?: React.FC;
}

export const tabs: Tab[] = [
  {
    path: "account",
    label: "Account",
    component: Account,
    navbarComponent: AccountsNavbar,
    icon: RequestQuoteSharp,
  },
  {
    path: "transactions",
    label: "Transactions",
    component: Txs,
    icon: Receipt,
  },
  {
    path: "contracts",
    label: "Contracts",
    component: Contracts,
    icon: CallToAction,
  },
  {
    path: "connections",
    label: "Connections",
    component: Connections,
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
  useNoticeAlchemyKeyMissing();
  useNoticeNewVersion();
  const { theme } = useTheme();

  return (
    <>
      <Sidebar sx={drawerPaperStyle(theme)} tabs={tabs} />
      <Box sx={contentStyle(theme)}>
        <NestedRoutes base="/">
          <Switch>
            {tabs.map((tab) => (
              <Route key={tab.path} path={tab.path}>
                <Navbar tab={tab} />
                <tab.component />
              </Route>
            ))}
            <Route>
              <Navbar tab={tabs[0]} />
              {createElement(tabs[0].component)}
            </Route>
          </Switch>
        </NestedRoutes>
      </Box>
    </>
  );
}

function AccountsNavbar() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <Stack direction="row">
      <AddressView address={address} />
    </Stack>
  );
}
