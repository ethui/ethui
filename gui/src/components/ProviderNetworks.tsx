import { invoke } from "@tauri-apps/api/tauri";
import { useRegisterActions } from "kbar";
import { ReactNode, createContext } from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshNetwork } from "../hooks/useRefreshNetwork";
import { Network } from "../types";

interface Value {
  networks?: Network[];
  network?: Network;
  setNetwork: (newNetwork: string) => Promise<unknown>;
  setNetworks: (newNetworks: Network[]) => Promise<unknown>;
  resetNetworks: () => Promise<Network[]>;
}

export const NetworksContext = createContext<Value>({} as Value);

const actionId = "network";

export function ProviderNetworks({ children }: { children: ReactNode }) {
  const { data: networks, mutate: mutateNetworks } =
    useInvoke<Network[]>("networks_get_list");
  const { data: network, mutate: mutateNetwork } = useInvoke<Network>(
    "networks_get_current"
  );

  const value = {
    networks,
    network,
    setNetwork: async (newNetwork: string) => {
      if (network?.name === newNetwork) return;

      await invoke("networks_set_current", { network: newNetwork });
    },
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

  useRefreshNetwork(mutateNetwork);

  useRegisterActions(
    [
      {
        id: actionId,
        name: "Change network",
      },
      ...(networks || []).map((network) => ({
        id: `${actionId}{network.name}`,
        name: network.name,
        parent: actionId,
        perform: () => value.setNetwork(network.name),
      })),
    ],
    [networks, value.setNetwork]
  );

  return (
    <NetworksContext.Provider value={value}>
      {children}
    </NetworksContext.Provider>
  );
}
