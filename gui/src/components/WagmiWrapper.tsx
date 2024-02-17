import React from "react";
import { type Chain, defineChain, http } from "viem";
import { createConfig, WagmiProvider } from "wagmi";

import { useNetworks } from "@/store";

interface Props {
  children: React.ReactNode;
}

export function WagmiWrapper({ children }: Props) {
  const network = useNetworks((s) => s.current);

  if (!network) return null;

  const rpcs = {
    http: [network.http_url],
    ws: network.ws_url ? [network.ws_url] : [],
  };

  const chain = {
    id: network.chain_id,
    network: network.name,
    name: network.name,
    nativeCurrency: {
      name: "Ether",
      symbol: network.currency,
      decimals: network.decimals,
    },
    rpcUrls: {
      default: { http: rpcs.http },
      public: { http: rpcs.http },
    },
    blockExplorers: { default: { name: "", url: "" } },
    contracts: {},
  } as const satisfies Chain;

  // const { publicClient, webSocketPublicClient } = configureChains(
  //   [buildChain(network)],
  //   [
  //     jsonRpcProvider({
  //       rpc: (_chain: Chain) => ({
  //         http: network.http_url,
  //       }),
  //     }),
  //   ],
  // );
  //
  const config = createConfig({
    chains: [chain],
  });

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}

// function buildChain(network: Network){
//   const rpcs = {
//     http: [network.http_url],
//     ws: network.ws_url ? [network.ws_url] : [],
//   };
//
//   return {
//     id: network.chain_id,
//     network: network.name,
//     name: network.name,
//     nativeCurrency: {
//       name: "Ether",
//       symbol: network.currency,
//       decimals: network.decimals,
//     },
//     rpcUrls: {
//       default: rpcs,
//       public: rpcs,
//     },
//   };
// }
