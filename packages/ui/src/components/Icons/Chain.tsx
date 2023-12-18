import { Avatar } from "@mui/material";
import { Network } from "@iron/types/network";

interface Props {
  network: Network;
}

export function IconChain({ network }: Props) {
  const size = 24;

  return (
    <Avatar
      sx={{ width: size, height: size }}
      alt={network.name}
      src={urlFor(network.chain_id)}
    >
      <Avatar
        sx={{ width: size, height: size }}
        alt={network.name}
        src={urlFor("unknown")}
      />
    </Avatar>
  );
}

const urlFor = (chainId: number | string) => `/images/chains/${chainId}.webp`;
