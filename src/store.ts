import browser from "webextension-polyfill";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

interface Settings {
  mnemonic: string;
  rpc: string;
}

interface Setters {
  setSettings: (settings: Settings) => void;
}

type State = Settings & Setters;

// exposes `browser.storage.local` as a zustand-compatible storage
const storageWrapper: StateStorage = {
  getItem: (name: string) =>
    new Promise((resolve) => {
      browser.storage.local.get(name).then((result) => resolve(result[name]));
    }),
  setItem: (key, value) =>
    new Promise((resolve) => {
      browser.storage.local.set({ [key]: value }).then((x) => resolve(x));
    }),
  removeItem: (key) => browser.storage.local.set({ [key]: undefined }),
};

export const useStore = create<State>()(
  persist(
    (set, _get) => ({
      mnemonic: "",
      rpc: "",
      setSettings: ({ mnemonic, rpc }) => set({ mnemonic, rpc }),
    }),
    {
      name: "iron-store",
      storage: createJSONStorage(() => {
        return storageWrapper;
      }),
    }
  )
);
