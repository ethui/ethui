import { Stack, Typography } from "@mui/material";

import { type Network } from "@iron/types/network";
import { IconChain } from "@iron/components/icons";

interface Props {
  network: Network;
}

export function ChainView({ network }: Props) {
  return (
    <Stack direction="row" spacing={1}>
      <IconChain chainId={network.chain_id} />
      <Typography>{network.name}</Typography>
    </Stack>
  );
}
