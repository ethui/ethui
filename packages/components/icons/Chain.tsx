import { Avatar } from "@mui/material";
import { Network } from "@iron/types/network";

import mainnet from "../images/chains/1.webp";
import optimism from "../images/chains/10.webp";
import anvil from "../images/chains/31337.webp";
import unknown from "../images/chains/unknown.webp";

export interface IconChainProps extends React.ComponentProps<typeof Avatar> {
  network: Network;
}

const Mappings: Record<number, string> = {
  1: mainnet,
  10: optimism,
  31337: anvil,
};

export function IconChain({ network, ...props }: IconChainProps) {
  const size = 24;
  console.log(Mappings[network.chain_id]);

  return (
    <Avatar
      sx={{ width: size, height: size }}
      alt={network.name}
      src={Mappings[network.chain_id] || unknown}
      {...props}
    />
  );
}
