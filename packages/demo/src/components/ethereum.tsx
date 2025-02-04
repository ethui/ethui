import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, mainnet, sepolia } from "viem/chains";
import { WagmiProvider } from "wagmi";

interface Props {
  children: React.ReactNode;
}

export const config = getDefaultConfig({
  appName: "ethui demo",
  projectId: "TODO",
  chains: [anvil, mainnet, sepolia],
  ssr: true,
});

export function Ethereum({ children }: Props) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
  );
}
