import { Button, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";

export function ThankYouStep() {
  useEffect(() => {
    invoke("settings_finish_onboarding");
  });

  return (
    <Stack alignItems="flex-end" spacing={3}>
      <Typography variant="h6" component="h1" alignSelf="start">
        Thank you
      </Typography>
      <Typography component="p">
        Thank you for using Iron. If you find any problems, please open an issue
        on GitHub.
      </Typography>

      <Link to="/home/account">
        <Button variant="contained">Finish</Button>
      </Link>
    </Stack>
  );
}
