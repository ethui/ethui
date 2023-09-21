import { Typography } from "@mui/material";

interface Props {
  children: React.ReactNode;
}

export function MonoText({ children }: Props) {
  return (
    <Typography sx={{ overflowWrap: "break-word", fontFamily: "monospace" }}>
      {children}
    </Typography>
  );
}
