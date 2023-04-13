import { type ProviderWithFallbackConfig } from "@wagmi/core";
import { providers } from "ethers";
import { useEffect, useState } from "react";
import {
  Chain,
  Client,
  WagmiConfig,
  configureChains,
  createClient,
} from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

import { useInvoke } from "../hooks/tauri";
import { Network } from "../types";

interface Props {
  children: React.ReactNode;
}

type WagmiChains = { chains: Chain[] };
type WagmiProvider =
  | providers.FallbackProvider
  | ProviderWithFallbackConfig<providers.JsonRpcProvider>;

type WagmiClient = Client<
  WagmiProvider & WagmiChains,
  providers.WebSocketProvider & WagmiChains
>;

export function WagmiWrapper({ children }: Props) {
  const { data: network } = useInvoke<Network>("get_current_network");
  const [client, setClient] = useState<WagmiClient>();

  useEffect(() => {
    if (!network) return;
    setClient(buildClient(network));
  }, [network]);

  if (!client) return <></>;

  return <WagmiConfig client={client}>{children}</WagmiConfig>;
}

function buildClient(network: Network) {
  const { provider, webSocketProvider } = configureChains(
    [buildChain(network)],
    [
      jsonRpcProvider({
        rpc: () => ({ http: network?.http_url }),
      }),
    ]
  );

  return createClient({ provider, webSocketProvider });
}

function buildChain(network: Network): Chain {
  const rpcs = {
    http: [network.http_url],
    ws: network.ws_url ? [network.ws_url] : [],
  };

  return {
    id: network.chain_id,
    network: network.name,
    name: network.name,
    nativeCurrency: {
      name: "Ether",
      symbol: network.currency,
      decimals: network.decimals,
    },
    rpcUrls: {
      default: rpcs,
      public: rpcs,
    },
  };
}
