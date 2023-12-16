import { Avatar } from "@mui/material";
import { useEffect, useState } from "react";
import { Network } from "@/types/network";

interface Props {
  network: Network;
}

export function IconChain({ network }: Props) {
  const [error, setError] = useState(false);
  const [src, setSrc] = useState<string | undefined>(urlFor(network.chain_id));
  const onError = () => setError(true);

  useEffect(() => {
    if (error) {
      setSrc(urlFor("unknown"));
    }
  }, [error, network.chain_id]);
  const size = 24;

  return (
    <Avatar
      sx={{ width: size, height: size }}
      alt={network.name}
      src={src}
      onError={onError}
    />
  );
}

const urlFor = (chainId: number | string) => `/images/chains/${chainId}.webp`;
