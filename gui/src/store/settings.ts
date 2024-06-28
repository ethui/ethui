import { invoke, event } from "@tauri-apps/api";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { Action } from "kbar";

import type { GeneralSettings } from "@ethui/types/settings";

interface Store {
  settings?: GeneralSettings;
  actions: Action[];

  reload: () => void;
}

const actionId = "settings/fastMode";

const store: StateCreator<Store> = (set) => ({
  settings: undefined,
  actions: [
    {
      id: actionId,
      name: "Fast mode",
      subtitle: "enable/disable",
      shortcut: ["˄ ", "+", " F"],
    },
    ...(["Enable", "Disable"] as const).map((mode, index) => ({
      id: `${actionId}/${mode}`,
      name: `${index + 1}: ${mode}`,
      parent: actionId,
      perform: () => {
        invoke("settings_set_fast_mode", { mode: mode === "Enable" });
      },
    })),
  ],

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
