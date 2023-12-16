import { Typography, type TypographyOwnProps } from "@mui/material";

interface Props {
  children: React.ReactNode;
  sx?: TypographyOwnProps["sx"];
  small?: boolean;
}

export function MonoText({ children, sx, small = false }: Props) {
  const variant = small ? "body2" : "body1";

  return (
    <Typography
      variant={variant}
      sx={{ overflowWrap: "break-word", fontFamily: "Roboto Mono", ...sx }}
    >
      {children}
    </Typography>
  );
}
