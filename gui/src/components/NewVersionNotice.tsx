import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  IconButton,
  Link,
  Snackbar,
  SnackbarOrigin,
} from "@mui/material";
import { useState } from "react";

import packageJson from "../../../package.json";

interface State extends SnackbarOrigin {
  open: boolean;
}

export async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/iron-wallet/iron/releases?per_page=1"
  );
  const json = await response.json();
  return json[0].tag_name;
}

const latestVersion = await getLatestVersion();
const currentVersion = `v${packageJson.version}`;

export function NewVersionNotice() {
  const [state, setState] = useState<State>({
    open: true,
    vertical: "bottom",
    horizontal: "right",
  });
  const { vertical, horizontal, open } = state;

  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway" || reason === "escapeKeyDown") {
      return;
    }

    setState({ ...state, open: false });
  };

  return currentVersion !== latestVersion ? (
    <Snackbar
      anchorOrigin={{ vertical, horizontal }}
      open={open}
      onClose={handleClose}
      key={vertical + horizontal}
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
        New release available.{" "}
        <Link
          href="https://github.com/iron-wallet/iron/releases"
          target="_blank"
        >
          Click to update.
        </Link>
      </Alert>
    </Snackbar>
  ) : null;
}
