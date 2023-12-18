import { Theme } from "@mui/material";
import { event, invoke } from "@tauri-apps/api";
import { Action } from "kbar";
import { create, StateCreator } from "zustand";

import { themes } from "@iron/components";
import { GeneralSettings } from "@iron/types/settings";

interface Store {
  mode: "auto" | "light" | "dark";
  theme: Theme;
  actions: Action[];

  reload: () => Promise<void>;
  changeMode: (mode: "auto" | "light" | "dark") => void;
}

const actionId = "themeMode";

const store: StateCreator<Store> = (set, get) => ({
  mode: "auto",
  theme: themes.lightTheme,

  actions: [
    {
      id: actionId,
      name: "Change theme mode",
    },
    ...(["auto", "dark", "light"] as const).map((mode) => ({
      id: `${actionId}/${mode}`,
      name: mode,
      parent: actionId,
      perform: () => get().changeMode(mode),
    })),
  ],

  async reload() {
    const { darkMode } = await invoke<GeneralSettings>("settings_get");

    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const mode =
      darkMode == "auto" ? (prefersDarkMode ? "dark" : "light") : darkMode;
    const theme: Theme = mode === "dark" ? themes.darkTheme : themes.lightTheme;

    set({ mode, theme });
  },

  async changeMode(mode) {
    await invoke("settings_set_dark_mode", { mode });
    set({ mode });
    get().reload();
  },
});

event.listen("settings-changed", async () => {
  await useTheme.getState().reload();
});

export const useTheme = create<Store>()(store);

(async () => {
  await useTheme.getState().reload();
})();
