import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  IconButton,
  Link,
  Snackbar,
  SnackbarOrigin,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import packageJson from "../../../package.json";

interface State extends SnackbarOrigin {
  open: boolean;
}

export async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/iron-wallet/iron/releases?per_page=1",
  );
  const json = await response.json();
  return json[0].tag_name;
}

export function NewVersionNotice() {
  const current = `v${packageJson.version}`;
  const [latest, setLatest] = useState<string | null>(null);
  const [state, setState] = useState<State>({
    open: true,
    vertical: "bottom",
    horizontal: "right",
  });
  const { vertical, horizontal, open } = state;

  useEffect(() => {
    getLatestVersion().then(setLatest);
  }, [setLatest]);

  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    event.stopPropagation();
    if (reason === "clickaway" || reason === "escapeKeyDown") {
      return;
    }

    setState({ ...state, open: false });
  };

  if (!latest || current === latest) return null;

  return (
    <Snackbar
      anchorOrigin={{ vertical, horizontal }}
      open={open}
      onClose={handleClose}
      key={vertical + horizontal}
    >
      <Link
        href="https://github.com/iron-wallet/iron/releases"
        sx={{
          "&&": {
            color: "inherit",
            textDecorationColor: "currentColor",
          },
        }}
        target="_blank"
      >
        <Alert
          severity="info"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              sx={{ p: 0.5 }}
              onClick={handleClose}
            >
              <CloseIcon />
            </IconButton>
          }
        >
          <Typography>New release available.</Typography>
        </Alert>
      </Link>
    </Snackbar>
  );
}
