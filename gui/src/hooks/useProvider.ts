import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";

import { Network } from "@/types";

import { useApi } from "./useApi";

export function useProvider() {
  const { data: network } = useApi<Network>("/networks/current");

  const [provider, setProvider] = useState<
    ReturnType<typeof createPublicClient> | undefined
  >(undefined);

  useEffect(() => {
    if (!network) return;

    const provider = createPublicClient({
      transport: http(network.http_url),
    });

    setProvider(provider);
  }, [network]);

  return provider;
}
