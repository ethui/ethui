import {
  Box,
  Drawer,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { findIndex } from "lodash-es";
import { Link, useLocation, useRoute } from "wouter";
import ArrowOutwardSharpIcon from "@mui/icons-material/ArrowOutwardSharp";
import RequestQuoteSharpIcon from "@mui/icons-material/RequestQuoteSharp";
import TerminalSharpIcon from "@mui/icons-material/TerminalSharp";
import OnlinePredictionSharpIcon from "@mui/icons-material/OnlinePredictionSharp";
import { parseInt, range, toString } from "lodash-es";

import { useKeyPress, useMenuAction } from "../hooks";

import {
  Balances,
  Contracts,
  Peers,
  QuickAddressSelect,
  QuickNetworkSelect,
  QuickWalletSelect,
  Txs,
} from "./";

import { Logo } from "./Logo";
import { SettingsButton } from "./SettingsButton";
import { ReactNode } from "react";
import { useTheme } from "../store";

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
    icon: ArrowOutwardSharpIcon,
  },
  {
    path: "contracts",
    name: "Contracts",
    component: Contracts,
    devOnly: true,
    icon: TerminalSharpIcon,
  },
  {
    path: "connections",
    name: "Connections",
    component: Peers,
    icon: OnlinePredictionSharpIcon,
  },
];

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
        }}
        sx={{
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: WIDTH_MD,
            [theme.breakpoints.down("md")]: {
              width: WIDTH_SM,
              justifyContent: "center",
            },
          },
        }}
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
          <Box flexShrink={0} sx={{ px: 2, pt: 6 }}>
            <Logo width={40} />
          </Box>
          <List sx={{ flexGrow: 1 }}>
            {TABS.map((tab, index) => (
              <ListItemButton
                selected={
                  index === Math.max(findIndex(TABS, { path: params?.path }), 0)
                }
                LinkComponent={Link}
                href={tab.path}
                key={tab.path}
                sx={{
                  minHeight: 50,
                }}
              >
                <ListItemIcon
                  sx={{
                    [theme.breakpoints.down("md")]: {
                      justifyContent: "center",
                    },
                  }}
                >
                  <tab.icon fontSize="medium" />
                </ListItemIcon>
                <ListItemText
                  sx={{
                    [theme.breakpoints.down("md")]: {
                      display: "none",
                    },
                  }}
                >
                  {tab.name}
                </ListItemText>
              </ListItemButton>
            ))}
          </List>
          <Grid
            container
            spacing={2}
            justifyContent="center"
            flexDirection="column"
            alignItems="stretch"
            sx={{
              [theme.breakpoints.down("md")]: {
                display: "none",
              },
            }}
            p={2}
          >
            <Grid item>
              <QuickWalletSelect />
            </Grid>
            <Grid item>
              <QuickAddressSelect />
            </Grid>
            <Grid item>
              <QuickNetworkSelect />
            </Grid>
            <Grid item></Grid>
          </Grid>
          <Box
            p={2}
            alignSelf="stretch"
            display="flex"
            justifyContent="flex-start"
            sx={{
              [theme.breakpoints.down("md")]: {
                justifyContent: "center",
              },
            }}
          >
            <SettingsButton />
          </Box>
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
