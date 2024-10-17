import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { useInvoke } from "#/hooks/useInvoke";
import type { StepProps } from ".";

export function InstallExtensionStep({ onSubmit }: StepProps) {
  const [detected, setDetected] = useState<boolean>(false);

  const { data: peerCount } = useInvoke<number>(
    "ws_peer_count",
    {},
    {
      refetchInterval: 200,
    },
  );

  useEffect(() => {
    if (detected) return;
    setDetected(!!peerCount && peerCount > 0);
  }, [detected, peerCount]);

  return (
    <div className="m-1 flex" sx={{ width: "100 % " }}>
      <Typography variant="h6" component="h1" alignSelf="start">
        Install Extension
      </Typography>

      <Typography>
        Go to{" "}
        <Link
          underline="hover"
          href="http://ethui.dev/onboarding/extension"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          this page
        </Link>{" "}
        to install the ethui extension.
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

      <Box alignSelf="flex-end">
        <Button onClick={onSubmit} disabled={!detected}>
          {detected ? "Next" : "Skip"}
        </Button>
      </Box>
    </div>
  );
}
