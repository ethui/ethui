import { JsonRpcProvider } from "@ethersproject/providers";
import { useEffect, useState } from "react";

import { Network } from "../types";
import { useInvoke } from "./tauri";

export function useProvider() {
  const { data: network } = useInvoke<Network>("get_current_network");

  const [provider, setProvider] = useState<JsonRpcProvider | null>(null);

  useEffect(() => {
    if (!network) return;

    const provider = new JsonRpcProvider(network.rpc_url);
    setProvider(provider);
  }, [network]);

  return provider;
}
