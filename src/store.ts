import browser from "webextension-polyfill";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

interface State {
  mnemonic: string;
  setMnemonic: (mnemonic: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, _get) => ({
      mnemonic: "",
      setMnemonic: (mnemonic) => set({ mnemonic: mnemonic }),
    }),
    {
      name: "iron-store",
      storage: createJSONStorage(() => storageWrapper),
    }
  )
);

const storageWrapper: StateStorage = {
  getItem: (name: string) =>
    new Promise((resolve) => {
      browser.storage.local
        .get(name)
        .then((result) => resolve(result as unknown as string));
    }),
  setItem: (key, value) => {
    browser.storage.local.set({ key, value });
  },
  removeItem: (key) => {
    browser.storage.local.set({ [key]: undefined });
  },
};
