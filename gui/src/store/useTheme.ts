import type { GeneralSettings } from "@ethui/types/settings";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { create, type StateCreator } from "zustand";
import { createHmrListenerTracker } from "./hmrListeners";

interface Store {
  mode: "auto" | "light" | "dark";

  reload: () => Promise<void>;
  changeMode: (mode: "auto" | "light" | "dark") => void;
}

const store: StateCreator<Store> = (set, get) => ({
  mode: "auto",

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

export const useTheme = create<Store>()(store);

const trackListener = createHmrListenerTracker();

trackListener(
  event.listen("settings-changed", () => useTheme.getState().reload()),
);

(async () => {
  await useTheme.getState().reload();
})();
