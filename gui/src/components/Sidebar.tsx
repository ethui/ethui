import CallToActionIcon from "@mui/icons-material/CallToAction";
import ImageIcon from "@mui/icons-material/Image";
import OnlinePredictionSharpIcon from "@mui/icons-material/OnlinePredictionSharp";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RequestQuoteSharpIcon from "@mui/icons-material/RequestQuoteSharp";
import { Box, Button, Drawer, IconButton, Stack, Toolbar } from "@mui/material";
import { blue } from "@mui/material/colors";
import { findIndex } from "lodash-es";
import { parseInt, range, toString } from "lodash-es";
import { ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";

import { useKeyPress, useMenuAction, useOS } from "../hooks";
import { useTheme } from "../store";
import {
  Account,
  Contracts,
  Nfts,
  Peers,
  QuickAddressSelect,
  QuickNetworkSelect,
  QuickWalletSelect,
  Txs,
} from "./";
import { CommandBarButton } from "./CommandBarButton";
import { Logo } from "./Logo";
import { SettingsButton } from "./SettingsButton";

export const TABS = [
  {
    path: "account",
    name: "Account",
    component: Account,
    icon: RequestQuoteSharpIcon,
  },
  { path: "nfts", name: "NFTs", component: Nfts, icon: ImageIcon },
  {
    path: "transactions",
    name: "Transactions",
    component: Txs,
    icon: ReceiptIcon,
  },
  {
    path: "contracts",
    name: "Contracts",
    component: Contracts,
    devOnly: true,
    icon: CallToActionIcon,
  },
  {
    path: "connections",
    name: "Connections",
    component: Peers,
    icon: OnlinePredictionSharpIcon,
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

export function Sidebar() {
  const [_match, params] = useRoute("/:path");
  const [_location, setLocation] = useLocation();
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");
  const { type } = useOS();

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
    <Drawer
      PaperProps={{
        variant: "lighter",
        sx: {
          width: WIDTH_MD,
          [breakpoint]: {
            width: WIDTH_SM,
            justifyContent: "center",
          },
        },
      }}
      sx={{ flexShrink: 0 }}
      variant="permanent"
    >
      {type && (
        <Box
          flexGrow={1}
          display="flex"
          flexDirection="column"
          sx={{
            [breakpoint]: {
              alignItems: "center",
            },
          }}
        >
          {type === "Darwin" ? (
            <Toolbar data-tauri-drag-region="true"></Toolbar>
          ) : (
            <Toolbar sx={{ p: 2 }} data-tauri-drag-region="true">
              <Logo width={40} />
            </Toolbar>
          )}
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
          </Stack>
          <Stack
            p={3}
            rowGap={1}
            sx={{
              [breakpoint]: {
                justifyContent: "center",
              },
            }}
          >
            <CommandBarButton />
            <SettingsButton />
          </Stack>
        </Box>
      )}
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
