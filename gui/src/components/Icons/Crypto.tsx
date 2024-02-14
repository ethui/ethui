import { Avatar, type AvatarProps } from "@mui/material";

import { isWhitelistedToken } from "@iron/data";
import { useTheme } from "@/store/theme";

interface Props extends AvatarProps {
  chainId: number;
  ticker: string;
  size?: "small" | "medium" | "large";
}

export function IconCrypto({ size = "medium", chainId, ticker }: Props) {
  const theme = useTheme((s) => s.theme);
  const themeMode = useTheme((s) => s.theme.palette.mode);

  if (!isWhitelistedToken(chainId, ticker)) return null;
  const finalTicker = isWhitelistedToken(chainId, ticker) ? ticker : "generic";

  const mode = themeMode === "dark" ? "black" : "white";

  let width = 24;
  if (size === "small") width = 16;
  if (size === "large") width = 40;

  return (
    <Avatar
      sx={{ bgcolor: theme.palette.grey[400], width, height: width }}
      src={urlFor(finalTicker, mode)}
      alt={ticker}
    />
  );
}

const urlFor = (ticker: string, type: "color" | "black" | "white") =>
  `/cryptocurrency-icons/${type}/${ticker.toLowerCase()}.svg`;
