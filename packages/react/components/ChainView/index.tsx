import { Typography } from "../Typography";
import IconChain from "../icons/Chain";

export interface ChainViewProps {
  name: string;
  chainId: number;
}

export function ChainView({ name, chainId }: ChainViewProps) {
  return (
    <div className=" m-4 items-center">
      <IconChain chainId={chainId} />
      <Typography>{name}</Typography>
    </div>
  );
}
