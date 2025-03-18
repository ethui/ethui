import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { type StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { GeneralSettings } from "@ethui/types/settings";

interface Store {
  settings?: GeneralSettings;

  setFastMode: (mode: boolean) => void;
  reload: () => void;
}

const store: StateCreator<Store> = (set) => ({
  settings: undefined,

  setFastMode(mode: boolean) {
    invoke("settings_set_fast_mode", { mode });
  },

  async reload() {
    const settings = await invoke<GeneralSettings>("settings_get");

    set({ settings });
  },
});

export const useSettings = create<Store>()(subscribeWithSelector(store));

event.listen("settings-changed", () => {
  useSettings.getState().reload();
});

useSettings.getState().reload();
