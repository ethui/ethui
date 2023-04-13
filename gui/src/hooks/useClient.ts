import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";

import { Network } from "../types";
import { useInvoke } from "./tauri";

export function useClient() {
  const { data: network } = useInvoke<Network>("networks_get_current");

  const [client, setClient] = useState<
    ReturnType<typeof createPublicClient> | undefined
  >(undefined);

  useEffect(() => {
    if (!network) return;

    const client = createPublicClient({
      transport: http(network.http_url),
    });

    setClient(client);
  }, [network]);

  return client;
}
