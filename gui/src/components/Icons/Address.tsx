import { getWhitelistedTokenNameAndSymbol } from "@ethui/data";
import { EffigyIcon } from "@ethui/ui/components/icons/effigy";
import { clsx } from "clsx";

interface Props {
  chainId: number;
  address?: string;
  effigy?: boolean;
  className?: string;
}

export function IconAddress({
  chainId,
  address,
  effigy = false,
  className,
}: Props) {
  const data = getWhitelistedTokenNameAndSymbol(chainId, address);

  if (!data && effigy) {
    return <EffigyIcon address={address || "0x0"} className={className} />;
  }

  return (
    <img
      alt={data?.symbol}
      className={clsx("h-6 w-6", className)}
      src={urlFor("generic")}
    />
  );
}

const urlFor = (ticker: string) =>
  `/cryptocurrency-icons/${ticker.toLowerCase()}.svg`;
