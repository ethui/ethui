import { PropsWithChildren } from "react";
import { type Chain, http } from "viem";
import { createConfig, WagmiProvider } from "wagmi";

import { useNetworks } from "@/store";

export function WagmiWrapper({ children }: PropsWithChildren) {
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

  const config = createConfig({
    chains: [chain],
    transports: { [chain.id]: http() },
  });

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
