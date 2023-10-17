import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { Action } from "kbar";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { get, post } from "@/api";
import { Network } from "@/types";

interface State {
  networks: Network[];
  current?: Network;
  actions: Action[];
}

interface Setters {
  setNetworks: (newNetworks: Network[]) => Promise<void>;
  setCurrent: (newNetwork: string) => Promise<void>;
  resetNetworks: () => Promise<void>;
  reload: () => Promise<void>;
  reloadActions: () => void;
  isAlchemySupportedNetwork: () => Promise<boolean>;
}

type Store = State & Setters;

const actionId = "networks";

const store: StateCreator<Store> = (set, storeGet) => ({
  networks: [],
  actions: [],

  async setNetworks(newNetworks) {
    // TODO: this could return the new list directly
    await post("/networks/list", { newNetworks });
    const networks = await get<Network[]>("/networks/list");
    set({ networks });
  },

  async setCurrent(newNetwork) {
    // TODO: this could return the new network directly
    await post("/networks/current", { network: newNetwork });

    const current = await get<Network>("/networks/current");
    set({ current });
  },

  async resetNetworks() {
    const networks = await post<Network[]>("/networks/reset");
    set({ networks });
  },

  async reload() {
    const current = await get<Network>("/networks/current");
    const networks = await get<Network[]>("/networks/list");
    set({ networks, current });
    storeGet().reloadActions();
  },

  reloadActions() {
    const networks = storeGet().networks;

    const actions = [
      {
        id: actionId,
        name: "Change network",
      },
      ...(networks || []).map((network) => ({
        id: `${actionId}/${network.name}`,
        name: network.name,
        parent: actionId,
        perform: () => {
          storeGet().setCurrent(network.name);
        },
      })),
    ];

    set({ actions });
  },

  async isAlchemySupportedNetwork() {
    const current = storeGet().current;

    if (!current) return false;

    return await invoke<boolean>("sync_alchemy_is_network_supported", {
      chainId: current.chain_id,
    });
  },
});

export const useNetworks = create<Store>()(subscribeWithSelector(store));

listen("networks-changed", async () => {
  await useNetworks.getState().reload();
});

(async () => {
  await useNetworks.getState().reload();
})();
