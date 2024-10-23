import { clsx } from "clsx";

import mainnet from "../../images/chains/1.webp";
import optimism from "../../images/chains/10.webp";
import polygon from "../../images/chains/137.webp";
import zksyncSepolia from "../../images/chains/300.webp";
import zksync from "../../images/chains/324.webp";
import base from "../../images/chains/8453.webp";
import anvil from "../../images/chains/31337.webp";
import arbitrum from "../../images/chains/42161.webp";
import polygonAmoy from "../../images/chains/80002.webp";
import baseSepolia from "../../images/chains/84532.webp";
import arbitrumSepolia from "../../images/chains/421614.webp";
import scrollSepolia from "../../images/chains/534351.webp";
import scroll from "../../images/chains/534352.webp";
import sepolia from "../../images/chains/11155111.webp";
import optimismSepolia from "../../images/chains/11155420.webp";
import unknown from "../../images/chains/unknown.webp";

export interface IconChainProps {
  chainId: number;
  className?: string;
}

const Mappings: Record<number, string> = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  80002: polygonAmoy,
  42161: arbitrum,
  421614: arbitrumSepolia,
  10: optimism,
  11155420: optimismSepolia,
  8453: base,
  84532: baseSepolia,
  324: zksync,
  300: zksyncSepolia,
  31337: anvil,
  534352: scroll,
  534351: scrollSepolia,
};

export function ChainIcon({ chainId, className }: IconChainProps) {
  return (
    <img
      alt={`Chain ${chainId}`}
      className={clsx("h-6 w-6", className)}
      src={Mappings[chainId] || unknown}
    />
  );
}
