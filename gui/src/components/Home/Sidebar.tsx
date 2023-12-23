import { SettingsSharp, TerminalSharp } from "@mui/icons-material";
import { Drawer, Stack, SxProps, Toolbar } from "@mui/material";
import { findIndex, parseInt, range, toString } from "lodash-es";
import { redirect, useLocation, useNavigate } from "react-router-dom";
import { useKBar } from "kbar";

import { useKeyPress, useMenuAction, useOS } from "@/hooks";
import { useSettingsWindow, useTheme } from "@/store";
import {
  Modal,
  Logo,
  QuickAddressSelect,
  QuickFastModeToggle,
  QuickNetworkSelect,
  QuickWalletSelect,
  Settings,
  SidebarButton,
} from "@/components";
import { type Tab } from "./Layout";

interface SidebarProps {
  sx?: SxProps;
  tabs: Tab[];
}

export function Sidebar({ sx, tabs }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");
  const { type } = useOS();
  const kbar = useKBar();
  const { open } = useSettingsWindow();

  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    navigate(tabs[parseInt(event.key) - 1].path);
  };

  useMenuAction((payload) => redirect(payload));

  useKeyPress(
    range(1, tabs.length + 1).map(toString),
    { meta: true },
    handleKeyboardNavigation,
  );

  useKeyPress(
    range(1, tabs.length + 1).map(toString),
    { ctrl: true },
    handleKeyboardNavigation,
  );

  if (!type) return null;

  return (
    <Drawer PaperProps={{ variant: "lighter", sx }} variant="permanent">
      <Toolbar sx={{ p: 2 }} data-tauri-drag-region="true">
        {type !== "Darwin" && <Logo width={40} />}
      </Toolbar>
      <Stack px={2} rowGap={1} flexGrow={1}>
        {tabs.map(({ path, label, icon }, index) => (
          <SidebarButton
            key={index}
            selected={
              index ===
              Math.max(findIndex(tabs, { path: location.pathname }), 0)
            }
            {...{ to: path, label, icon }}
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
          icon={TerminalSharp}
          label="Command Bar"
        />
        <SidebarButton onClick={open} icon={SettingsSharp} label="Settings" />
        <SettingsModal />
      </Stack>
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
