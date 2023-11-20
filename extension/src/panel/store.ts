import browser from "webextension-polyfill";
import { create, StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { Request, Response, Start } from "@/types";

interface State {
  requests: { request: Request; response?: Response }[];
}

interface Setters {
  reset: () => void;
  processMsgs: (msg: Array<Request | Response>) => void;
}

type Store = State & Setters;

let tabId: number | undefined;

// get tab ID at startup
browser.tabs
  .query({
    active: true,
    currentWindow: true,
  })
  .then(([{ id }]) => (tabId = id));

const store: StateCreator<Store> = (set, get) => ({
  requests: [],

  reset() {
    set({ requests: [] });
  },

  processMsgs(msgs) {
    const { requests } = get();
    const newRequests = [...requests];

    msgs.forEach((msg) => {
      if (msg.type === "request") {
        newRequests.push({ request: msg });
      } else if (msg.type === "response") {
        newRequests.forEach((r) => {
          if (r.request.data.id === msg.data.id) {
            r.response = msg;
            return;
          }
        });
      }
    });

    set({ requests: newRequests });
  },
});

export const useStore = create<Store>()(subscribeWithSelector(store));

browser.runtime.onMessage.addListener((msg: Request | Response | Start) => {
  if (msg.tabId != tabId) return;

  if (msg.type === "start") {
    useStore.getState().reset();
    useStore.getState().processMsgs(msg.data || []);
  } else {
    useStore.getState().processMsgs([msg]);
  }
});
