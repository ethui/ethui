import { Box, useTheme } from "@mui/material";
import { red } from "@mui/material/colors";

import { useInvoke } from "@/hooks";

export function DevBuildNotice() {
  const theme = useTheme();
  const { data: buildMode } = useInvoke<string>("get_build_mode");
  const size = 80;

  if (buildMode === "debug") {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          backgroundColor: red[300],
          zIndex: 1000000,
          position: "fixed",
          top: -size / 2,
          right: -size / 2,
          transform: "rotateZ(-135deg)",
          textAlign: "center",
          transition: theme.transitions.create(["backgroundColor", "opacity"]),
          "&:hover": {
            backgroundColor: red[200],
            opacity: "0",
            cursor: "initial",
          },
        }}
      >
        <Box sx={{ transform: "rotateZ(180deg)" }}>{"debug"}</Box>
      </Box>
    );
  } else {
    return null;
  }
}
