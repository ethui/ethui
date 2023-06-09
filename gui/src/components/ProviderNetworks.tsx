import { invoke } from "@tauri-apps/api/tauri";
import { ReactNode, createContext } from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshNetwork } from "../hooks/useRefreshNetwork";
import { Network } from "../types";

interface Value {
  networks?: Network[];
  setNetworks: (newNetworks: Network[]) => Promise<unknown>;
  resetNetworks: () => Promise<Network[]>;
}

export const NetworksContext = createContext<Value>({} as Value);

export function ProviderNetworks({ children }: { children: ReactNode }) {
  const { data: networks, mutate: mutateNetworks } =
    useInvoke<Network[]>("networks_get_list");

  const value = {
    networks,
    setNetworks: async (newNetworks: Network[]) => {
      await invoke("networks_set_list", { newNetworks: newNetworks });

      mutateNetworks();
    },
    resetNetworks: async () => {
      const networks: Network[] = await invoke("networks_reset");

      mutateNetworks();

      return networks;
    },
  };

  useRefreshNetwork(mutateNetworks);

  return (
    <NetworksContext.Provider value={value}>
      {children}
    </NetworksContext.Provider>
  );
}
