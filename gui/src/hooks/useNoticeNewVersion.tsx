import CloseIcon from "@mui/icons-material/Close";
import { IconButton, Link, Typography } from "@mui/material";
import { SnackbarKey, useSnackbar } from "notistack";
import { useEffect, useState } from "react";

import { useApi } from "./useApi";

export async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/iron-wallet/iron/releases?per_page=1",
  );
  const json = await response.json();
  return json[0].tag_name.replace("v", "");
}

let key: SnackbarKey;

export function useNoticeNewVersion() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { data: current } = useApi<string>("/internals/version");
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    getLatestVersion().then(setLatest);
  }, [setLatest]);

  useEffect(() => {
    if (!latest || current === latest) return;

    key = enqueueSnackbar(
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
        <Typography>New release available.</Typography>
      </Link>,
      {
        key: "new_release",
        preventDuplicate: true,
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
        persist: true,
        action: () => (
          <IconButton
            aria-label="close"
            color="inherit"
            sx={{ p: 0.5 }}
            onClick={() => closeSnackbar(key)}
          >
            <CloseIcon />
          </IconButton>
        ),
      },
    );
  }, [latest, current, closeSnackbar, enqueueSnackbar]);

  return null;
}
