import { Stack, Typography } from "@mui/material";

import { type Network } from "@iron/types/network";
import { IconChain } from "@/components/Icons";

interface Props {
  network: Network;
}

export function ChainView({ network }: Props) {
  return (
    <Stack direction="row" spacing={1}>
      <IconChain network={network} />
      <Typography>{network.name}</Typography>
    </Stack>
  );
}
