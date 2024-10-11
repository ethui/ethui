import { Box, Button, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";

export function ThankYouStep() {
  useEffect(() => {
    invoke("settings_finish_onboarding");
  });

  return (
    <Stack spacing={3} width="100%">
      <Typography variant="h6" component="h1" alignSelf="start">
        Thank you
      </Typography>
      <Typography component="p">
        Thank you for using ethui. If you find any problems, please open an
        issue on GitHub.
      </Typography>

      <Box alignSelf="flex-end">
        <Link to="/home/account">
          <Button variant="contained">Finish</Button>
        </Link>
      </Box>
    </Stack>
  );
}
