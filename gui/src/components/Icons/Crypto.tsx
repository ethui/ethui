import { Avatar, type AvatarProps } from "@mui/material";

import { getWhitelistedTokenNameAndSymbol } from "@iron/data";

interface Props extends AvatarProps {
  chainId: number;
  address?: string;
  size?: "small" | "medium" | "large";
}

export function IconCrypto({ chainId, address, size = "medium" }: Props) {
  const data = getWhitelistedTokenNameAndSymbol(chainId, address);
  if (!data) return null;

  let width = 28;
  if (size === "small") width = 20;
  if (size === "large") width = 40;

  return (
    <Avatar
      sx={{
        width,
        height: width,
      }}
      src={urlFor(data.symbol)}
      alt={data.symbol}
    >
      <Avatar
        sx={{
          width,
          height: width,
        }}
        src={urlFor("generic")}
        alt={data.symbol}
      />
    </Avatar>
  );
}

const urlFor = (ticker: string) =>
  `/cryptocurrency-icons/${ticker.toLowerCase()}.svg`;
