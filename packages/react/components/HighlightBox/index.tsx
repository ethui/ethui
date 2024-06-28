import { Box, type SxProps, useTheme } from "@mui/material";

export interface HighlightBoxProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  sx?: SxProps;
}
export function HighlightBox({ sx, children, fullWidth }: HighlightBoxProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.highlight1.main,
        p: 2,
        maxWidth: "100%",
        ...(fullWidth && { width: "100%" }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
