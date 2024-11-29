import { useEffect, useState } from "react";

import { toast } from "@ethui/ui/hooks/use-toast";
import { useInvoke } from "./useInvoke";
import { ToastAction } from "@ethui/ui/components/shadcn/toast";

async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/ethui/ethui/releases?per_page=1",
  );
  const json = await response.json();
  return json[0].tag_name.replace("v", "");
}

export function useNoticeNewVersion() {
  const { data: current } = useInvoke("get_version");
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    getLatestVersion().then(setLatest);
  }, []);

  useEffect(() => {
    if (!latest || current === latest) return;

    toast({
      title: "New release available",
      action: (
        <ToastAction altText="Set key" asChild>
          <a
            href="https://github.com/ethui/ethui/releases"
            target="_blank"
            rel="noreferrer"
          >
            Download
          </a>
        </ToastAction>
      ),
    });
  }, [latest, current]);

  return null;
}
