import { invoke, event } from "@tauri-apps/api";
import { Action } from "kbar";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { GeneralSettings } from "@iron/types/settings";

interface State {
  settings?: GeneralSettings;
  actions: Action[];
}

interface Setters {
  reload: () => void;
  reloadActions: () => void;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  settings: undefined,
  actions: [],

  async reload() {
    const settings = await invoke<GeneralSettings>("settings_get");

    set({ settings });
    get().reloadActions();
  },

  reloadActions() {
    const actions = [
      {
        id: "settings/fastMode",
        name: "Fast mode",
      },

      {
        id: `settings/fastMode/enable`,
        parent: "settings/fastMode",
        name: "Fast Mode > Enable",
        perform: () => invoke("settings_set_fast_mode", { mode: true }),
      },
      {
        id: `settings/fastMode/disable`,
        parent: "settings/fastMode",
        name: "Fast Mode > Disable",
        perform: () => invoke("settings_set_fast_mode", { mode: false }),
      },
    ];

    set({ actions });
  },
});

export const useSettings = create<Store>()(subscribeWithSelector(store));

event.listen("settings-changed", () => {
  useSettings.getState().reload();
});

useSettings.getState().reload();
