import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { GeneralSettings } from "../types";

interface State {
  settings?: GeneralSettings;
}

interface Setters {
  reload: () => unknown;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, _get) => ({
  settings: undefined,

  async reload() {
    const settings = await invoke<GeneralSettings>("settings_get");

    set({ settings });
  },
});

export const useSettings = create<Store>()(subscribeWithSelector(store));

listen("settings-changed", async () => {
  await useSettings.getState().reload();
});

useSettings.getState().reload();
