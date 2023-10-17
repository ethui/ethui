import { listen } from "@tauri-apps/api/event";
import { Action } from "kbar";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { get, post } from "@/api";
import { GeneralSettings } from "@/types";

interface State {
  settings?: GeneralSettings;
  actions: Action[];
}

interface Setters {
  reload: () => void;
  reloadActions: () => void;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, storeGet) => ({
  settings: undefined,
  actions: [],

  async reload() {
    const settings = await get<GeneralSettings>("/settings");

    set({ settings });
    storeGet().reloadActions();
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
        perform: () => post("/settings/set_fast_mode", { mode: true }),
      },
      {
        id: `settings/fastMode/disable`,
        parent: "settings/fastMode",
        name: "Fast Mode > Disable",
        perform: () => post("/settings/set_fast_mode", { mode: false }),
      },
    ];

    set({ actions });
  },
});

export const useSettings = create<Store>()(subscribeWithSelector(store));

listen("settings-changed", () => {
  useSettings.getState().reload();
});

useSettings.getState().reload();
