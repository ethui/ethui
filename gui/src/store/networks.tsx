import { event, invoke } from "@tauri-apps/api";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { Action } from "kbar";

import type { Network } from "@ethui/types/network";
import { IconChain } from "@ethui/react/components";

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

const store: StateCreator<Store> = (set, get) => ({
  networks: [],
  actions: [],

  async setNetworks(newNetworks) {
    const networks = await invoke<Network[]>("networks_set_list", {
      newNetworks,
    });
    set({ networks });
  },

  async setCurrent(network) {
    const current = await invoke<Network>("networks_set_current", { network });

    set({ current });
  },

  async resetNetworks() {
    const networks = await invoke<Network[]>("networks_reset");
    set({ networks });
  },

  async reload() {
    const current = await invoke<Network>("networks_get_current");
    const networks = await invoke<Network[]>("networks_get_list");
    set({ networks, current });
    get().reloadActions();
  },

  reloadActions() {
    const networks = get().networks;

    const actions = [
      {
        id: actionId,
        name: "Change network",
        subtitle: `${networks.length} network${
          networks.length > 1 ? "s" : ""
        } available`,
        shortcut: ["N"],
      },
      ...(networks || []).map((network, index) => ({
        id: `${actionId}/${network.name}`,
        name: `${index + 1}: ${network.name}`,
        icon: <IconChain chainId={network.chain_id} />,
        parent: actionId,
        perform: () => {
          get().setCurrent(network.name);
        },
      })),
    ];

    set({ actions });
  },

  async isAlchemySupportedNetwork() {
    const current = get().current;

    if (!current) return false;

    return await invoke<boolean>("sync_alchemy_is_network_supported", {
      chainId: current.chain_id,
    });
  },
});

export const useNetworks = create<Store>()(subscribeWithSelector(store));

event.listen("networks-changed", async () => {
  await useNetworks.getState().reload();
});

event.listen("networks-added", async () => {
  await useNetworks.getState().reload();
});

event.listen("networks-removed", async () => {
  await useNetworks.getState().reload();
});

(async () => {
  await useNetworks.getState().reload();
})();
