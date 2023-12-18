import { Stack, Typography } from "@mui/material";

import { IconChain } from "../icons";

export interface ChainViewProps {
  name: string;
  chainId: number;
}

export function ChainView({ name, chainId }: ChainViewProps) {
  return (
    <Stack direction="row" spacing={1}>
      <IconChain chainId={chainId} />
      <Typography>{name}</Typography>
    </Stack>
  );
}
