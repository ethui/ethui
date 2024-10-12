import { Avatar, type AvatarProps } from "@mui/material";

import { getWhitelistedTokenNameAndSymbol } from "@ethui/data";
import { IconEffigy } from "@ethui/react/components";

interface Props extends AvatarProps {
  chainId: number;
  address?: string;
  size?: "small" | "medium" | "large";
  effigy?: boolean;
}

export function IconAddress({
  chainId,
  address,
  size = "medium",
  effigy = false,
}: Props) {
  const data = getWhitelistedTokenNameAndSymbol(chainId, address);

  if (!data && effigy) {
    return <IconEffigy address={address || "0x0"} />;
  }

  let width = 28;
  if (size === "small") width = 20;
  if (size === "large") width = 40;

  return (
    <Avatar
      sx={{
        width,
        height: width,
      }}
      src={data && urlFor(data.symbol)}
      alt={data?.symbol}
    >
      <Avatar
        sx={{
          width,
          height: width,
        }}
        src={urlFor("generic")}
        alt={data?.symbol}
      />
    </Avatar>
  );
}

const urlFor = (ticker: string) =>
  `/cryptocurrency-icons/${ticker.toLowerCase()}.svg`;
