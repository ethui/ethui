import { JsonRpcProvider } from "@ethersproject/providers";
import { useEffect, useState } from "react";

import { useSettings } from "./useSettings";

export function useProvider() {
  const { data, isLoading } = useSettings();

  const [provider, setProvider] = useState<JsonRpcProvider | null>(null);

  useEffect(() => {
    if (!data?.network) return;

    const network = data.network.networks[data.network.current];
    const provider = new JsonRpcProvider(network.url);
    setProvider(provider);
  }, [data?.network]);

  return { provider, isLoading };
}
