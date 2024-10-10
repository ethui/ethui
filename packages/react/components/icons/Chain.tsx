import { Avatar } from "@mui/material";

import mainnet from "../../images/chains/1.webp";
import sepolia from "../../images/chains/11155111.webp";
import polygon from "../../images/chains/137.webp";
import polygonAmoy from "../../images/chains/80002.webp";
import arbitrum from "../../images/chains/42161.webp";
import arbitrumSepolia from "../../images/chains/421614.webp";
import optimism from "../../images/chains/10.webp";
import optimismSepolia from "../../images/chains/11155420.webp";
import base from "../../images/chains/8453.webp";
import baseSepolia from "../../images/chains/84532.webp";
import zksync from "../../images/chains/324.webp";
import zksyncSepolia from "../../images/chains/300.webp";
import anvil from "../../images/chains/31337.webp";
import unknown from "../../images/chains/unknown.webp";
import scroll from "../../images/chains/534352.webp";
import scrollSepolia from "../../images/chains/534351.webp";

export interface IconChainProps extends React.ComponentProps<typeof Avatar> {
  chainId: number;
  size?: "small" | "medium" | "large";
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

export function IconChain({
  chainId,
  size = "medium",
  ...props
}: IconChainProps) {
  let width = 24;
  if (size === "small") width = 16;
  if (size === "large") width = 40;

  return (
    <Avatar
      sx={{ width, height: width }}
      src={Mappings[chainId] || unknown}
      {...props}
    />
  );
}
