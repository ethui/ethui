import { Stack } from "@mui/material";

import { Typography } from "../Typography";
import IconChain from "../icons/Chain";

export interface ChainViewProps {
  name: string;
  chainId: number;
}

export function ChainView({ name, chainId }: ChainViewProps) {
  return (
    <div className=" items-center m-4">
      <IconChain chainId={chainId} />
      <Typography>{name}</Typography>
    </div>
  );
}
