import { Stack, Typography } from "@mui/material";
import { red } from "@mui/material/colors";

import { useApi } from "@/hooks";

export function DevBuildNotice() {
  const { data: buildMode } = useApi<string>("/internals/build_mode");

  if (buildMode === "debug") {
    return (
      <Stack
        alignItems="center"
        sx={{
          backgroundColor: red[300],
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
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
