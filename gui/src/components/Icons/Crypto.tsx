import { Avatar, type AvatarProps } from "@mui/material";

import { useTheme } from "@/store/theme";

interface Props extends AvatarProps {
  ticker?: string;
  size?: "small" | "medium" | "large";
}

export function IconCrypto({ size = "medium", ...props }: Props) {
  const theme = useTheme((s) => s.theme);
  const themeMode = useTheme((s) => s.theme.palette.mode);

  const mode = themeMode === "dark" ? "black" : "white";

  let width = 24;
  if (size === "small") width = 16;
  if (size === "large") width = 40;

  return (
    <Avatar
      sx={{ bgcolor: theme.palette.grey[400], width, height: width }}
      src={urlFor("generic", mode)}
      {...props}
    />
  );
}

const urlFor = (ticker: string, type: "color" | "black" | "white") =>
  `/cryptocurrency-icons/${type}/${ticker.toLowerCase()}.svg`;
