import { Avatar } from "@mui/material";

import mainnet from "../images/chains/1.webp";
import optimism from "../images/chains/10.webp";
import anvil from "../images/chains/31337.webp";
import unknown from "../images/chains/unknown.webp";

export interface IconChainProps extends React.ComponentProps<typeof Avatar> {
  chainId: number;
}

const Mappings: Record<number, string> = {
  1: mainnet,
  10: optimism,
  31337: anvil,
};

export function IconChain({ chainId, ...props }: IconChainProps) {
  const size = 24;

  return (
    <Avatar
      sx={{ width: size, height: size }}
      src={Mappings[chainId] || unknown}
      {...props}
    />
  );
}
