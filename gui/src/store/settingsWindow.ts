import { window as tauriWindow } from "@tauri-apps/api";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { Action } from "kbar";

interface State {
  show: boolean;
  actions: Action[];
}

interface Setters {
  open: () => unknown;
  toggle: () => unknown;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  show: false,
  actions: [
    {
      id: "settings",
      name: "Settings",
      subtitle: "open/close",
      shortcut: ["˄ ", "+", " S"],
      perform: () => set({ show: !get().show }),
    },
  ],
  open() {
    set({ show: true });
  },
  toggle() {
    set({ show: !get().show });
  },
});

export const useSettingsWindow = create<Store>()(subscribeWithSelector(store));

tauriWindow.appWindow.listen("menu:settings", () => {
  useSettingsWindow.getState().toggle();
});
