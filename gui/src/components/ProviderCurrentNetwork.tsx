import { invoke } from "@tauri-apps/api/tauri";
import { useRegisterActions } from "kbar";
import { ReactNode, createContext } from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshNetwork } from "../hooks/useRefreshNetwork";
import { useNetworks } from "../store";
import { Network } from "../types";

interface Value {
  currentNetwork?: Network;
  setCurrentNetwork: (newNetwork: string) => Promise<unknown>;
}

export const CurrentNetworkContext = createContext<Value>({} as Value);

const actionId = "network";

export function ProviderCurrentNetwork({ children }: { children: ReactNode }) {
  const { data: currentNetwork, mutate: mutateNetwork } = useInvoke<Network>(
    "networks_get_current"
  );

  const value = {
    currentNetwork,
    setCurrentNetwork: async (newNetwork: string) => {
      if (currentNetwork?.name === newNetwork) return;

      await invoke("networks_set_current", { network: newNetwork });
    },
  };

  useRefreshNetwork(mutateNetwork);

  const networks = useNetworks((s) => s.networks);

  useRegisterActions(
    [
      {
        id: actionId,
        name: "Change network",
      },
      ...(networks || []).map((network) => ({
        id: `${actionId}/${network.name}`,
        name: network.name,
        parent: actionId,
        perform: () => {
          value.setCurrentNetwork(network.name);
        },
      })),
    ],
    [networks, value.setCurrentNetwork]
  );

  return (
    <CurrentNetworkContext.Provider value={value}>
      {children}
    </CurrentNetworkContext.Provider>
  );
}
