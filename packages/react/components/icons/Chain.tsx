import { Avatar } from "@mui/material";

import mainnet from "../../images/chains/1.webp";
import optimism from "../../images/chains/10.webp";
import anvil from "../../images/chains/31337.webp";
import unknown from "../../images/chains/unknown.webp";

export interface IconChainProps extends React.ComponentProps<typeof Avatar> {
  chainId: number;
  size?: "small" | "medium" | "large";
}

const Mappings: Record<number, string> = {
  1: mainnet,
  10: optimism,
  31337: anvil,
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
