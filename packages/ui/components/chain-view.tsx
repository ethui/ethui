import { ChainIcon } from "./icons/chain";

export interface ChainViewProps {
  name: string;
  chainId: number;
}

export function ChainView({ name, chainId }: ChainViewProps) {
  return (
    <div className="flex items-center gap-x-2">
      <ChainIcon chainId={chainId} />
      <span>{name}</span>
    </div>
  );
}
