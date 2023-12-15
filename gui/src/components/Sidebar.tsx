import {
  CallToAction,
  OnlinePredictionSharp,
  Receipt,
  RequestQuoteSharp,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Theme,
  Toolbar,
} from "@mui/material";
import { blue } from "@mui/material/colors";
import { findIndex, parseInt, range, toString } from "lodash-es";
import { ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";

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

const sidebarBoxStyle = (theme: Theme) => {
  return {
    [theme.breakpoints.down("sm")]: {
      alignItems: "center",
    },
  };
};

const drawerPaperStyle = (theme: Theme) => {
  return {
    width: WIDTH_MD,
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
      <Box
        flexGrow={1}
        display="flex"
        flexDirection="column"
        sx={sidebarBoxStyle(theme)}
      >
        <Toolbar sx={{ p: 2 }} data-tauri-drag-region="true">
          {type !== "Darwin" && <Logo width={40} />}
        </Toolbar>
        <Stack px={3} py={1} rowGap={1} flexGrow={1}>
          {TABS.map((tab, index) => (
            <SidebarTab
              key={index}
              tab={tab}
              selected={
                index === Math.max(findIndex(TABS, { path: params?.path }), 0)
              }
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

interface SidebarTabProps {
  tab: (typeof TABS)[number];
  selected: boolean;
}

function SidebarTab({ tab, selected }: SidebarTabProps) {
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");

  return (
    <>
      <IconButton
        LinkComponent={Link}
        href={tab.path}
        disabled={selected}
        color="inherit"
        size="small"
        sx={{
          display: "none",
          [breakpoint]: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          "&.Mui-disabled": {
            backgroundColor: blue[500],
            color: "white",
          },
        }}
      >
        <tab.icon fontSize="medium" />
      </IconButton>
      <Button
        variant="sidebar"
        disabled={selected}
        startIcon={<tab.icon fontSize="medium" />}
        LinkComponent={Link}
        href={tab.path}
        sx={{
          [breakpoint]: {
            display: "none",
          },
        }}
      >
        {tab.name}
      </Button>
    </>
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
