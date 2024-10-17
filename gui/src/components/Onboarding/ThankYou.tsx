import { Box, Button, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

export function ThankYouStep() {
  useEffect(() => {
    invoke("settings_finish_onboarding");
  });

  return (
    <div m-8 width="100%">
      <Typography variant="h6" component="h1" alignSelf="start">
        Thank you
      </Typography>
      <Typography component="p">
        Thank you for using ethui. If you find any problems, please open an
        issue on GitHub.
      </Typography>

      <Box alignSelf="flex-end">
        <Link to="/home/account">
          <Button >Finish</Button>
        </Link>
      </Box>
    </div>
  );
}
