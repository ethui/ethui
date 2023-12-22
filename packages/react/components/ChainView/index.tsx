import { Stack, SxProps } from "@mui/material";

import { Typography } from "../";
import { IconChain } from "../icons";

export interface ChainViewProps {
  name: string;
  chainId: number;
}

export function ChainView({ name, chainId }: ChainViewProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconChain chainId={chainId} />
      <Typography>{name}</Typography>
    </Stack>
  );
}
