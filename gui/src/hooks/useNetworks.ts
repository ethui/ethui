import { useContext } from "react";

import { NetworksContext } from "../components/ProviderNetworks";

export function useNetworks() {
  return useContext(NetworksContext);
}
