import { useContext } from "react";

import { CurrentNetworkContext } from "../components/ProviderCurrentNetwork";

export function useCurrentNetwork() {
  return useContext(CurrentNetworkContext);
}
