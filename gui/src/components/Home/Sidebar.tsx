import { SettingsSharp, TerminalSharp, HelpSharp } from "@mui/icons-material";
import { Drawer, Stack, SxProps, Toolbar } from "@mui/material";
import { parseInt, range } from "lodash-es";
import { useKBar } from "kbar";
import { invoke } from "@tauri-apps/api";
import { Link, useNavigate } from "@tanstack/react-router";

import { type Tab } from "@ethui/types/ui";
import { useKeyPress, useMenuAction, useOS } from "@/hooks";
import { useSettings, useSettingsWindow, useTheme } from "@/store";
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

interface SidebarProps {
  sx?: SxProps;
  tabs: Tab[];
  onStartTour: () => void;
}

export function Sidebar({ sx, tabs, onStartTour }: SidebarProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const breakpoint = theme.breakpoints.down("sm");
  const { type } = useOS();
  const kbar = useKBar();
  const { toggle } = useSettingsWindow();

  const { settings } = useSettings();
  const fastMode = settings?.fastMode;

  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    const tabIndex = parseInt(event.key) - 1;
    navigate({ to: tabs[tabIndex].path });
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
      <header></header>
      <Toolbar sx={{ p: 2 }} data-tauri-drag-region="true">
        {type !== "Darwin" && <Logo width={40} />}
      </Toolbar>
      <Stack px={2} rowGap={1} flexGrow={1}>
        {tabs.map(({ path, label, icon }, index) => (
          <SidebarButton
            key={index}
            component={Link}
            to={path}
            activeProps={{ selected: true }}
            {...{ label, icon }}
            homepage-tour={`actions-${label}`}
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
        <div className="quick-select">
          <QuickWalletSelect />
          <QuickAddressSelect />
          <QuickNetworkSelect />
        </div>
        <div className="fast-mode">
          <QuickFastModeToggle />
        </div>
      </Stack>
      <Stack p={3} rowGap={1}>
        <div className="command-bar">
          <SidebarButton
            onClick={kbar.query.toggle}
            icon={TerminalSharp}
            label="Command Bar"
          />
        </div>
        <div className="settings">
          <SidebarButton
            onClick={toggle}
            icon={SettingsSharp}
            label="Settings"
          />
        </div>
        <div className="tour">
          <SidebarButton
            onClick={onStartTour}
            icon={HelpSharp}
            label="Start Tour"
          />
        </div>
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
