import type { SxProps } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { parseInt as lodashParseInt, range } from "lodash-es";

import type { Tab } from "@ethui/types/ui";
import { useKeyPress } from "#/hooks/useKeyPress";
import { useMenuAction } from "#/hooks/useMenuAction";
import { useSettings } from "#/store/useSettings";
import { useSettingsWindow } from "#/store/useSettingsWindow";

interface SidebarProps {
  sx?: SxProps;
  tabs: Tab[];
}

export function Sidebar({ tabs }: SidebarProps) {
  const navigate = useNavigate();

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

  return null;
}
