import { Stack, Typography } from "@mui/material";
import { red } from "@mui/material/colors";

import { useInvoke } from "../hooks";

export function DevBuildNotice() {
  const { data: buildMode } = useInvoke<string>("get_build_mode");

  if (buildMode === "debug") {
    return (
      <Stack
        alignItems="center"
        sx={{
          backgroundColor: red[300],
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          height: "15px",
          zIndex: 1000000,
        }}
      >
        <Typography sx={{ fontSize: "10px" }}>dev build</Typography>
      </Stack>
    );
  } else {
    return null;
  }
}
