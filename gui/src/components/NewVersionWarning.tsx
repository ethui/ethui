import CloseIcon from "@mui/icons-material/Close";
import { Alert, Collapse, IconButton } from "@mui/material";
import { useState } from "react";

import packageJson from "../../package.json";

export async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/iron-wallet/iron/releases"
  );
  const json = await response.json();
  return json[0].tag_name;
}

const latestVersion = await getLatestVersion();
const currentVersion = packageJson.version;

export function NewVersionWarning() {
  const [open, setOpen] = useState(true);

  return (
    currentVersion !== latestVersion && (
      <Collapse in={open}>
        <Alert
          severity="info"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => {
                setOpen(false);
              }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          There&apos;s a new version of Iron Wallet available. Please update to
          the latest version.
        </Alert>
      </Collapse>
    )
  );
}
