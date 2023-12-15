import {
  CallToAction,
  OnlinePredictionSharp,
  Receipt,
  RequestQuoteSharp,
} from "@mui/icons-material";
import { Box, Drawer, Stack, Theme, Toolbar } from "@mui/material";
import { findIndex, parseInt, range, toString } from "lodash-es";
import { ReactNode } from "react";
import { useLocation, useRoute } from "wouter";

import { useKeyPress, useMenuAction, useOS } from "@/hooks";
import { useTheme, useWallets } from "@/store";

import {
  Account,
  AddressView,
  CommandBarButton,
  Connections,
  Contracts,
  Logo,
  QuickAddressSelect,
  QuickFastModeToggle,
  QuickNetworkSelect,
  QuickWalletSelect,
  SettingsButton,
  SidebarButton,
  Txs,
} from "./";

export const TABS = [
  {
    path: "account",
    name: "Account",
    component: Account,
    navbarComponent: AccountsNavbar,
    icon: RequestQuoteSharp,
  },
  {
    path: "transactions",
    name: "Transactions",
    component: Txs,
    icon: Receipt,
  },
  {
    path: "contracts",
    name: "Contracts",
    component: Contracts,
    devOnly: true,
    icon: CallToAction,
  },
  {
    path: "connections",
    name: "Connections",
    component: Connections,
    icon: OnlinePredictionSharp,
  },
];

export const DEFAULT_TAB = TABS[0];

const WIDTH_MD = 200;
const WIDTH_SM = 72;

export function SidebarLayout({ children }: { children: ReactNode }) {
  const [_location, setLocation] = useLocation();
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");

  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    setLocation(TABS[parseInt(event.key) - 1].path);
  };

  useMenuAction((payload) => setLocation(payload));

  useKeyPress(
    range(1, TABS.length + 1).map(toString),
    { meta: true },
    handleKeyboardNavigation,
  );

  useKeyPress(
    range(1, TABS.length + 1).map(toString),
    { ctrl: true },
    handleKeyboardNavigation,
  );

  return (
    <>
      <Sidebar />
      <Box
        sx={{
          pl: `${WIDTH_MD}px`,
          transition: theme.transitions.create("padding-left"),
          [breakpoint]: {
            pl: `${WIDTH_SM}px`,
          },
        }}
      >
        {children}
      </Box>
    </>
  );
}

const drawerPaperStyle = (theme: Theme) => {
  return {
    width: WIDTH_MD,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.down("sm")]: {
      width: WIDTH_SM,
      justifyContent: "center",
    },
  };
};

export function Sidebar() {
  const [_match, params] = useRoute("/:path");
  const [_location] = useLocation();
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");
  const { type } = useOS();

  if (!type) return null;

  return (
    <Drawer
      PaperProps={{
        variant: "lighter",
        sx: drawerPaperStyle(theme),
      }}
      sx={{ flexShrink: 0 }}
      variant="permanent"
    >
      <Box flexGrow={1} display="flex" flexDirection="column">
        <Toolbar sx={{ p: 2 }} data-tauri-drag-region="true">
          {type !== "Darwin" && <Logo width={40} />}
        </Toolbar>
        <Stack
          px={2}
          rowGap={1}
          flexGrow={1}
          sx={{ [breakpoint]: { alignItems: "center" } }}
        >
          {TABS.map((tab, index) => (
            <SidebarButton
              key={index}
              selected={
                index === Math.max(findIndex(TABS, { path: params?.path }), 0)
              }
              href={tab.path}
              label={tab.name}
              icon={tab.icon}
            />
          ))}
        </Stack>
        <Stack
          rowGap={2}
          p={3}
          sx={{
            [breakpoint]: {
              display: "none",
            },
          }}
        >
          <QuickWalletSelect />
          <QuickAddressSelect />
          <QuickNetworkSelect />
          <QuickFastModeToggle />
        </Stack>
        <Stack p={3} rowGap={1}>
          <CommandBarButton />
          <SettingsButton />
        </Stack>
      </Box>
    </Drawer>
  );
}

function AccountsNavbar() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <Stack direction="row">
      <AddressView address={address} copyIcon />
    </Stack>
  );
}
