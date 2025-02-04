import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { type StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { GeneralSettings } from "@ethui/types/settings";
import type { Action } from "#/components/CommandBar";

interface Store {
  settings?: GeneralSettings;
  actions: Action[];

  reload: () => void;
}

const actionId = "settings/fastMode";

const store: StateCreator<Store> = (set) => ({
  settings: undefined,
  actions: ["Enable", "Disable"].map((mode) => ({
    id: `${actionId}/${mode}`,
    text: mode,
    run: () => {
      invoke("settings_set_fast_mode", { mode: mode === "Enable" });
    },
  })),

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
