import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil } from "viem/chains";
import { WagmiProvider } from "wagmi";

interface Props {
  children: React.ReactNode;
}

const config = getDefaultConfig({
  appName: "ethui demo",
  projectId: "TODO",
  chains: [anvil],
  ssr: true,
});

export function Ethereum({ children }: Props) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
  );
}
