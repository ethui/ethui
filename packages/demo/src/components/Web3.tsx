"use client";

import { createConfig, http, WagmiProvider } from "wagmi";
import { foundry } from "@wagmi/core/chains";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";

const wagmi = createConfig({
  chains: [foundry],
  transports: { [foundry.id]: http() },
});

export function Web3({ children }: Props) {
  return (
    <WagmiProvider config={wagmi}>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
  );
}

interface Props {
  children: React.ReactNode;
}
