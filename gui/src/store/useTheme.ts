import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { type StateCreator, create } from "zustand";

import type { GeneralSettings } from "@ethui/types/settings";
import type { Action } from "#/components/CommandBar";

interface Store {
  mode: "auto" | "light" | "dark";
  actions: Action[];

  reload: () => Promise<void>;
  changeMode: (mode: "auto" | "light" | "dark") => void;
}

const actionId = "themeMode";

const store: StateCreator<Store> = (set, get) => ({
  mode: "auto",

  actions: [
    ...(["auto", "dark", "light"] as const).map((mode) => ({
      id: `${actionId}/${mode}`,
      text: `${mode}`,
      run: () => get().changeMode(mode),
    })),
  ],

  async reload() {
    const { darkMode } = await invoke<GeneralSettings>("settings_get");

    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const mode =
      darkMode === "auto" ? (prefersDarkMode ? "dark" : "light") : darkMode;

    if (mode === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    set({ mode });
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
