import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { Action } from "kbar";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { GeneralSettings } from "@/types/settings";

interface Store {
  settings?: GeneralSettings;
  actions: Action[];

  reload: () => void;
}

const actionId = "settings/fastMode";

const store: StateCreator<Store> = (set, get) => ({
  settings: undefined,
  actions: [
    {
      id: actionId,
      name: "Fast mode",
    },
    ...(["enable", "disable"] as const).map((mode) => ({
      id: `${actionId}/${mode}`,
      name: mode,
      parent: actionId,
      perform: () =>
        invoke("settings_set_fast_mode", { mode: !get().settings?.fastMode }),
    })),
  ],

  async reload() {
    const settings = await invoke<GeneralSettings>("settings_get");

    set({ settings });
  },
});

export const useSettings = create<Store>()(subscribeWithSelector(store));

listen("settings-changed", () => {
  useSettings.getState().reload();
});

useSettings.getState().reload();
