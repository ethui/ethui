import { type SnackbarKey, useSnackbar } from "notistack";
import { useEffect, useState } from "react";

import { Button } from "@ethui/ui/components/shadcn/button";
import { Link } from "@tanstack/react-router";
import { CircleX } from "lucide-react";
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
      <Link href="https://github.com/ethui/ethui/releases" target="_blank">
        <span>New release available.</span>
      </Link>,
      {
        key: "new_release",
        persist: true,
        action: () => (
          <Button
            size="icon"
            aria-label="close"
            color="inherit"
            onClick={() => closeSnackbar(key)}
          >
            <CircleX />
          </Button>
        ),
      },
    );
  }, [latest, current, closeSnackbar, enqueueSnackbar]);

  return null;
}
