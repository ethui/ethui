import { Box, Stack, SvgIcon, Theme } from "@mui/material";
import {
  RequestQuoteSharp,
  Receipt,
  CallToAction,
  OnlinePredictionSharp,
} from "@mui/icons-material";
import { createElement } from "react";
import { Outlet } from "react-router-dom";
import { SnackbarProvider } from "notistack";

import { useNoticeAlchemyKeyMissing, useNoticeNewVersion } from "@/hooks";
import {
  Account,
  AddressView,
  CommandBar,
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
    path: "/home/account",
    label: "Account",
    component: Account,
    navbarComponent: AccountsNavbar,
    icon: RequestQuoteSharp,
  },
  {
    path: "/home/transactions",
    label: "Transactions",
    component: Txs,
    icon: Receipt,
  },
  {
    path: "/home/contracts",
    label: "Contracts",
    component: Contracts,
    icon: CallToAction,
  },
  {
    path: "/home/connections",
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
    <CommandBar>
      <SnackbarProvider>
        <Sidebar sx={drawerPaperStyle(theme)} tabs={tabs} />
        <Box sx={contentStyle(theme)}>
          <Outlet />
          {/* <NestedRoutes base="/"> */}
          {/*   <Switch> */}
          {/*     {tabs.map((tab) => ( */}
          {/*       <Route key={tab.path} path={tab.path}> */}
          {/*         <Navbar tab={tab} /> */}
          {/*         <tab.component /> */}
          {/*       </Route> */}
          {/*     ))} */}
          {/*     <Route> */}
          {/*       <Navbar tab={tabs[0]} /> */}
          {/*       {createElement(tabs[0].component)} */}
          {/*     </Route> */}
          {/*   </Switch> */}
          {/* </NestedRoutes> */}
        </Box>
      </SnackbarProvider>
    </CommandBar>
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
