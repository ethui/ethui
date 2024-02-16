import { Avatar, type AvatarProps } from "@mui/material";

import { getWhitelistedTokenNameAndSymbol } from "@iron/data";
import { useTheme } from "@/store/theme";

interface Props extends AvatarProps {
  chainId: number;
  address?: string;
  size?: "small" | "medium" | "large";
}

export function IconCrypto({ size = "medium", chainId, address }: Props) {
  const theme = useTheme((s) => s.theme);
  const themeMode = useTheme((s) => s.theme.palette.mode);

  const mode = themeMode === "dark" ? "black" : "white";

  const data = getWhitelistedTokenNameAndSymbol(chainId, address);

  let width = 24;
  if (size === "small") width = 16;
  if (size === "large") width = 40;

  console.log(data);
  return (
    <Avatar
      sx={{ bgcolor: theme.palette.grey[400], width, height: width }}
      src={urlFor(data?.symbol || "generic", mode)}
      alt={data?.symbol}
    />
  );
}

const urlFor = (ticker: string, type: "color" | "black" | "white") =>
  `/cryptocurrency-icons/${type}/${ticker.toLowerCase()}.svg`;
