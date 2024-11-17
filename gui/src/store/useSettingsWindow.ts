import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Action } from "#/components/CommandBar";

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
      text: "Settings",
      run: () => set({ show: !get().show }),
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
