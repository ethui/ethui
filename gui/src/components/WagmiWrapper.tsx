import React from "react";
import { FallbackTransport } from "viem";
import {
  Chain,
  type Config,
  PublicClient,
  WagmiConfig,
  WebSocketPublicClient,
  configureChains,
  createConfig,
} from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

import { useCurrentNetwork } from "../hooks/useCurrentNetwork";
import { Network } from "../types";

interface Props {
  children: React.ReactNode;
}

type WagmiConfig = Config<
  PublicClient<FallbackTransport>,
  WebSocketPublicClient<FallbackTransport>
>;

export function WagmiWrapper({ children }: Props) {
  const { currentNetwork } = useCurrentNetwork();

  if (!currentNetwork) return null;

  const { publicClient, webSocketPublicClient } = configureChains(
    [buildChain(currentNetwork)],
    [jsonRpcProvider({ rpc: () => ({ http: currentNetwork?.http_url }) })]
  );

  const config = createConfig({
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
