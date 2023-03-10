import browser from "webextension-polyfill";
import { StateStorage, createJSONStorage } from "zustand/middleware";

// exposes `browser.storage.local` as a zustand-compatible storage
const browserStorageBackend: StateStorage = {
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

export const storageBackend = {
  name: "iron-store",
  storage: createJSONStorage(() => {
    return browserStorageBackend;
  }),
};
