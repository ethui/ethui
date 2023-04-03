import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

import { Network } from "../types";
import { useInvoke } from "./tauri";

export function useClient() {
  const { data: network } = useInvoke<Network>("get_current_network");

  const [client, setClient] = useState<ReturnType<
    typeof createPublicClient
  > | null>(null);

  useEffect(() => {
    if (!network) return;

    const client = createPublicClient({
      chain: mainnet,
      transport: http(network.http_url),
    });

    setClient(client);
  }, [network]);

  return client;
}
