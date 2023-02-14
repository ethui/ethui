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

export const useStore = create<State>()(
  persist(
    (set, _get) => ({
      mnemonic: "",
      rpc: "",
      setSettings: ({ mnemonic, rpc }) => {
        console.log(mnemonic);
        set({ mnemonic, rpc });
      },
    }),
    {
      name: "iron-store",
      storage: createJSONStorage(() => storageWrapper),
    }
  )
);

// exposes `browser.storage.local` as a zustand-compatible storage
const storageWrapper: StateStorage = {
  getItem: (name: string) =>
    new Promise((resolve) => {
      browser.storage.local
        .get(name)
        .then((result) => resolve(result[name] as unknown as string));
    }),
  setItem: (key, value) => {
    browser.storage.local.set({ key, value });
  },
  removeItem: (key) => {
    browser.storage.local.set({ [key]: undefined });
  },
};
