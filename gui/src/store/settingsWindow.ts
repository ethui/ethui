import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { Action } from "kbar";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

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

getCurrentWebviewWindow().listen("menu:settings", () => {
  useSettingsWindow.getState().toggle();
});
