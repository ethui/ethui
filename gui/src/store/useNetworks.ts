import type { Network } from "@ethui/types/network";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createHmrListenerTracker } from "./hmrListeners";

interface State {
  networks: Network[];
  current?: Network;
}

interface Setters {
  setNetworks: (newNetworks: Network[]) => Promise<void>;
  setCurrent: (newNetwork: string) => Promise<void>;
  resetNetworks: () => Promise<void>;
  reload: () => Promise<void>;
  isAlchemySupportedNetwork: () => Promise<boolean>;
}

type Store = State & Setters;

const store: StateCreator<Store> = (set, get) => ({
  networks: [],

  async setNetworks(newNetworks) {
    const networks = await invoke<Network[]>("networks_set_list", {
      newNetworks,
    });
    set({ networks });
  },

  async setCurrent(network) {
    const current = await invoke<Network>("networks_set_current", {
      name: network,
    });

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
  },

  async isAlchemySupportedNetwork() {
    const current = get().current;

    if (!current) return false;

    return await invoke<boolean>("sync_alchemy_is_network_supported", {
      chainId: current.id.chain_id,
    });
  },
});

export const useNetworks = create<Store>()(subscribeWithSelector(store));

const trackListener = createHmrListenerTracker();

trackListener(
  event.listen("networks-changed", () => useNetworks.getState().reload()),
);

trackListener(
  event.listen("current-network-changed", () =>
    useNetworks.getState().reload(),
  ),
);

(async () => {
  await useNetworks.getState().reload();
})();
