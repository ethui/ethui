import { SettingsSharp, TerminalSharp } from "@mui/icons-material";
import { Drawer, Stack, type SxProps, Toolbar } from "@mui/material";
import { Link, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useKBar } from "kbar";
import { parseInt as lodashParseInt, range } from "lodash-es";

import type { Tab } from "@ethui/types/ui";
import { Logo } from "#/components/Logo";
import { Modal } from "#/components/Modal";
import { QuickAddressSelect } from "#/components/QuickAddressSelect";
import { QuickFastModeToggle } from "#/components/QuickFastModeToggle";
import { QuickNetworkSelect } from "#/components/QuickNetworkSelect";
import { QuickWalletSelect } from "#/components/QuickWalletSelect";
import { Settings } from "#/components/Settings/Settings";
import { SidebarButton } from "#/components/SidebarButton";
import { useKeyPress } from "#/hooks/useKeyPress";
import { useMenuAction } from "#/hooks/useMenuAction";
import { useOS } from "#/hooks/useOS";
import { useSettings } from "#/store/useSettings";
import { useSettingsWindow } from "#/store/useSettingsWindow";
import { useTheme } from "#/store/useTheme";

interface SidebarProps {
  sx?: SxProps;
  tabs: Tab[];
}

export function Sidebar({ sx, tabs }: SidebarProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");
  const { type } = useOS();
  const kbar = useKBar();
  const { toggle } = useSettingsWindow();

  const { settings } = useSettings();
  const fastMode = settings?.fastMode;

  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    navigate({ to: tabs[lodashParseInt(event.key) - 1].path });
  };

  const handleFastModeToggle = () => {
    invoke("settings_set_fast_mode", { mode: !fastMode });
  };

  const handleOpenCloseSettings = (event: KeyboardEvent) => {
    event.preventDefault();
    useSettingsWindow.getState().toggle();
  };

  useMenuAction((payload) => {
    navigate({ to: payload });
  });

  useKeyPress(
    range(1, tabs.length + 1),
    { meta: true },
    handleKeyboardNavigation,
  );

  useKeyPress(
    range(1, tabs.length + 1),
    { ctrl: true },
    handleKeyboardNavigation,
  );

  useKeyPress(["F", "f"], { meta: true }, handleFastModeToggle);
  useKeyPress(["F", "f"], { ctrl: true }, handleFastModeToggle);

  useKeyPress(["S", "s"], { meta: true }, handleOpenCloseSettings);
  useKeyPress(["S", "s"], { ctrl: true }, handleOpenCloseSettings);

  if (!type) return null;

  return (
    <Drawer PaperProps={{ variant: "lighter", sx }} variant="permanent">
      <Toolbar sx={{ p: 2 }} data-tauri-drag-region="true">
        {type !== "macos" && <Logo width={40} />}
      </Toolbar>
      <Stack px={2} rowGap={1} flexGrow={1}>
        {tabs.map(({ path, label, icon }, index) => (
          <SidebarButton
            key={index}
            component={Link}
            to={path}
            activeProps={{ selected: true }}
            {...{ label, icon }}
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
        <SidebarButton onClick={toggle} icon={SettingsSharp} label="Settings" />
        <SettingsModal />
      </Stack>
    </Drawer>
  );
}

function SettingsModal() {
  const { show, toggle } = useSettingsWindow();

  return (
    <Modal
      open={show}
      onClose={toggle}
      sx={{ outline: "none", width: "90%", height: "90%", maxWidth: "900px" }}
    >
      <Settings />
    </Modal>
  );
}
