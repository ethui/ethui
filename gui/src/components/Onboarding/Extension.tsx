import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { useInvoke } from "@/hooks";

import { StepProps } from ".";

const URL =
  process.env.NODE_ENV === "production"
    ? "https://iron-wallet.xyz"
    : "http://localhost:3000";

export function InstallExtensionStep({ onSubmit }: StepProps) {
  const [detected, setDetected] = useState<boolean>(false);

  const { data: peerCount } = useInvoke<number>(
    "ws_peer_count",
    {},
    {
      refreshInterval: 200,
    },
  );

  useEffect(() => {
    if (detected) return;
    setDetected(!!peerCount && peerCount > 0);
  }, [detected, peerCount, setDetected]);

  return (
    <Stack spacing={2} alignItems="flex-end">
      <Typography variant="h6" component="h1" alignSelf="start">
        Install Extension
      </Typography>

      <Typography>
        Go to{" "}
        <Link
          underline="hover"
          href={`${URL}/onboarding/extension`}
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          this page
        </Link>{" "}
        to install the Iron wallet extension.
      </Typography>

      <Box sx={{ alignSelf: "stretch" }}>
        {!detected ? (
          <Alert severity="info">
            <CircularProgress size={10} /> Waiting...
          </Alert>
        ) : (
          <Alert severity="success">Extension detected!</Alert>
        )}
      </Box>

      <Button variant="contained" onClick={onSubmit} disabled={!detected}>
        Next
      </Button>
    </Stack>
  );
}
