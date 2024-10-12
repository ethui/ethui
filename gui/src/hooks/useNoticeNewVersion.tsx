import CloseIcon from "@mui/icons-material/Close";
import { IconButton, Link, Typography } from "@mui/material";
import { type SnackbarKey, useSnackbar } from "notistack";
import { useEffect, useState } from "react";

import { useInvoke } from "./useInvoke";

export async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/ethui/ethui/releases?per_page=1",
  );
  const json = await response.json();
  return json[0].tag_name.replace("v", "");
}

let key: SnackbarKey;

export function useNoticeNewVersion() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { data: current } = useInvoke("get_version");
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    getLatestVersion().then(setLatest);
  }, []);

  useEffect(() => {
    if (!latest || current === latest) return;

    key = enqueueSnackbar(
      <Link
        href="https://github.com/ethui/ethui/releases"
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
