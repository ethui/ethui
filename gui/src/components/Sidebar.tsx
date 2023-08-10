import CallToActionIcon from "@mui/icons-material/CallToAction";
import OnlinePredictionSharpIcon from "@mui/icons-material/OnlinePredictionSharp";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RequestQuoteSharpIcon from "@mui/icons-material/RequestQuoteSharp";
import { Box, Button, Drawer, IconButton, Stack } from "@mui/material";
import { grey } from "@mui/material/colors";
import { findIndex } from "lodash-es";
import { parseInt, range, toString } from "lodash-es";
import { ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";

import { useKeyPress, useMenuAction } from "../hooks";
import { useTheme } from "../store";
import {
  Balances,
  Contracts,
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
    path: "details",
    name: "Balances",
    component: Balances,
    icon: RequestQuoteSharpIcon,
  },
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
const WIDTH_SM = 80;

export function Sidebar({ children }: { children: ReactNode }) {
  const [_match, params] = useRoute("/:path");
  const [_location, setLocation] = useLocation();
  const { theme } = useTheme();

  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    setLocation(TABS[parseInt(event.key) - 1].path);
  };

  useMenuAction((payload) => setLocation(payload));

  useKeyPress(
    range(1, TABS.length + 1).map(toString),
    { meta: true },
    handleKeyboardNavigation
  );

  useKeyPress(
    range(1, TABS.length + 1).map(toString),
    { ctrl: true },
    handleKeyboardNavigation
  );

  return (
    <Box>
      <Drawer
        PaperProps={{
          variant: "lighter",
          sx: {
            width: WIDTH_MD,
            [theme.breakpoints.down("md")]: {
              width: WIDTH_SM,
              justifyContent: "center",
            },
          },
        }}
        sx={{ flexShrink: 0 }}
        variant="permanent"
      >
        <Box
          flexGrow={1}
          display="flex"
          flexDirection="column"
          sx={{
            [theme.breakpoints.down("md")]: {
              alignItems: "center",
            },
          }}
        >
          <Box flexShrink={0} sx={{ px: 2, pt: 2 }}>
            <Logo width={40} />
          </Box>
          <Stack p={2} rowGap={1} flexGrow={1}>
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
            rowGap={1}
            p={2}
            sx={{
              [theme.breakpoints.down("md")]: {
                display: "none",
              },
            }}
          >
            <QuickWalletSelect />
            <QuickAddressSelect />
            <QuickNetworkSelect />
          </Stack>
          <Stack
            p={2}
            rowGap={1}
            sx={{
              [theme.breakpoints.down("md")]: {
                justifyContent: "center",
              },
            }}
          >
            <CommandBarButton />
            <SettingsButton />
          </Stack>
        </Box>
      </Drawer>
      <Box
        sx={{
          pl: `${WIDTH_MD}px`,
          [theme.breakpoints.down("md")]: {
            pl: `${WIDTH_SM}px`,
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

interface SidebarTabProps {
  tab: (typeof TABS)[number];
  selected: boolean;
}

function SidebarTab({ tab, selected }: SidebarTabProps) {
  const { theme } = useTheme();
  const backgroundColor = theme.palette.mode === "dark" ? 800 : 200;

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
          height: 40,
          width: 40,
          [theme.breakpoints.down("md")]: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          "&.Mui-disabled": {
            backgroundColor: grey[backgroundColor],
          },
        }}
      >
        <tab.icon fontSize="medium" />
      </IconButton>
      <Button
        color="inherit"
        disabled={selected}
        startIcon={<tab.icon fontSize="medium" />}
        LinkComponent={Link}
        href={tab.path}
        sx={{
          justifyContent: "flex-start",
          [theme.breakpoints.down("md")]: {
            display: "none",
          },
          "&.Mui-disabled": {
            backgroundColor: grey[backgroundColor],
          },
        }}
      >
        {tab.name}
      </Button>
    </>
  );
}
