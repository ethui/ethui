import { PaletteMode, Theme, createTheme } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { Action } from "kbar";
import { StateCreator, create } from "zustand";

import { GeneralSettings } from "../types";

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
  theme: createTheme(getDesignTokens("light")),

  actions: [
    {
      id: actionId,
      name: "Change theme mode",
      section: "",
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
      "(prefers-color-scheme: dark)"
    ).matches;

    const mode =
      darkMode == "auto" ? (prefersDarkMode ? "dark" : "light") : darkMode;

    set({ mode, theme: createTheme(getDesignTokens(mode)) });
  },

  async changeMode(mode) {
    await invoke("settings_set_dark_mode", { mode });
    set({ mode });
    get().reload();
  },
});

export const useTheme = create<Store>()(store);

(async () => {
  await useTheme.getState().reload();
})();

function getDesignTokens(mode: PaletteMode) {
  return {
    palette: {
      mode,
      ...(mode === "light"
        ? {
            background: {},
          }
        : {
            background: {},
          }),
    },
  };
}
