import type { GeneralSettings } from "@ethui/types/settings";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

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

const listenerUnsubscribers: Array<Promise<() => void>> = [];
const trackListener = (listener: Promise<() => void>) => {
  listenerUnsubscribers.push(listener);
};

const disposeListeners = () => {
  for (const listener of listenerUnsubscribers) {
    listener.then((unlisten) => unlisten()).catch(() => {});
  }
};

if (import.meta.hot) {
  import.meta.hot.dispose(disposeListeners);
}

trackListener(
  event.listen("settings-changed", () => {
    useSettings.getState().reload();
  }),
);

useSettings.getState().reload();
