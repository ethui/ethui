import React from "react";
import { FallbackTransport } from "viem";
import {
  Chain,
  type Config,
  configureChains,
  createConfig,
  PublicClient,
  WagmiConfig,
  WebSocketPublicClient,
} from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

import { Network } from "@iron/types/network";
import { useNetworks } from "@/store";

interface Props {
  children: React.ReactNode;
}

type WagmiConfig = Config<
  PublicClient<FallbackTransport>,
  WebSocketPublicClient<FallbackTransport>
>;

export function WagmiWrapper({ children }: Props) {
  const network = useNetworks((s) => s.current);

  if (!network) return null;

  const { publicClient, webSocketPublicClient } = configureChains(
    [buildChain(network)],
    [
      jsonRpcProvider({
        rpc: (_chain: Chain) => ({
          http: network.http_url,
        }),
      }),
    ],
  );
  const config = createConfig({
    autoConnect: true,
    publicClient,
    webSocketPublicClient,
  });

  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}

function buildChain(network: Network): Chain {
  const rpcs = {
    http: [network.http_url],
    ws: network.ws_url ? [network.ws_url] : [],
  };

  return {
    id: network.chain_id,
    network: network.name,
    name: "Ethereum",
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
