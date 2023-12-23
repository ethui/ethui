import {
  CallToAction,
  OnlinePredictionSharp,
  Receipt,
  RequestQuoteSharp,
  SettingsSharp as SettingsSharpIcon,
  TerminalSharp as TerminalSharpIcon,
} from "@mui/icons-material";
import { Box, Drawer, Stack, Theme, Toolbar } from "@mui/material";
import { findIndex, parseInt, range, toString } from "lodash-es";
import { useLocation, useRoute } from "wouter";
import { useKBar } from "kbar";

import { useKeyPress, useMenuAction, useOS } from "@/hooks";
import { useSettingsWindow, useTheme, useWallets } from "@/store";
import {
  Modal,
  Account,
  AddressView,
  Connections,
  Contracts,
  Logo,
  QuickAddressSelect,
  QuickFastModeToggle,
  QuickNetworkSelect,
  QuickWalletSelect,
  Settings,
  SidebarButton,
  Txs,
} from "@/components";

export const TABS = [
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
    devOnly: true,
    icon: CallToAction,
  },
  {
    path: "connections",
    label: "Connections",
    component: Connections,
    icon: OnlinePredictionSharp,
  },
];

export const DEFAULT_TAB = TABS[0];

const WIDTH_MD = 200;
const WIDTH_SM = 72;

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
  const [_location, setLocation] = useLocation();
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");
  const { type } = useOS();
  const kbar = useKBar();
  const { open } = useSettingsWindow();

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
        <Stack px={2} rowGap={1} flexGrow={1}>
          {TABS.map(({ path, label, icon }, index) => (
            <SidebarButton
              key={index}
              selected={
                index === Math.max(findIndex(TABS, { path: params?.path }), 0)
              }
              {...{ href: path, label, icon }}
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
          <SidebarButton
            onClick={kbar.query.toggle}
            icon={TerminalSharpIcon}
            label="Command Bar"
          />
          <SidebarButton
            onClick={open}
            icon={SettingsSharpIcon}
            label="Settings"
          />
          <SettingsModal />
        </Stack>
      </Box>
    </Drawer>
  );
}

function SettingsModal() {
  const { show, close } = useSettingsWindow();

  return (
    <Modal
      open={show}
      onClose={close}
      sx={{ outline: "none", width: "90%", height: "90%", maxWidth: "900px" }}
    >
      <Settings />
    </Modal>
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
