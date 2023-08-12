import { Action } from "kbar";
import { StateCreator, create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface State {
  show: boolean;
  actions: Action[];
}

interface Setters {
  open: () => unknown;
  close: () => unknown;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, _get) => ({
  show: false,
  actions: [
    {
      id: "settings",
      name: "Open settings",
      perform: () => set({ show: true }),
    },
  ],
  open() {
    set({ show: true });
  },
  close() {
    set({ show: false });
  },
});

export const useSettings = create<Store>()(subscribeWithSelector(store));

addEventListener("keypress", (event) => {
  if (event.metaKey && event.key === ",") useSettings.getState().open();
});
