import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";

import type { Network } from "@ethui/types/network";
import { useInvoke } from "./useInvoke";

export function useProvider() {
  const { data: network } = useInvoke<Network>("networks_get_current");

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
