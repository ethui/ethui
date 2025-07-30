import { ToastAction } from "@ethui/ui/components/shadcn/toast";
import { toast } from "@ethui/ui/hooks/use-toast";
import { platform } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect, useState } from "react";
import { useEventListener } from "#/hooks/useEventListener";
import { useInvoke } from "./useInvoke";

type UpdateReady = { version: string };

export function useUpdates() {
  const isMacos = platform() === "macos";

  useAutoUpdates({ enabled: !!isMacos });
  useNoticeNewVersion({ enabled: !isMacos });
}

function useAutoUpdates({ enabled }: { enabled: boolean }) {
  useEventListener({
    event: "update-ready",
    enabled,
    callback: ({ payload, ...rest }: { payload: UpdateReady }) => {
      console.log(payload, rest);
      toast({
        title: `Version ${payload.version} automatically installed. Restart to apply.`,
        action: (
          <ToastAction altText="Restart now" asChild>
            <button type="button" onClick={relaunch}>
              Restart now
            </button>
          </ToastAction>
        ),
      });
    },
  });
}

function useNoticeNewVersion({ enabled }: { enabled: boolean }) {
  const { data: current } = useInvoke("get_version");
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    getLatestVersion().then(setLatest);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const isDev = import.meta.env.MODE === "development";
    if (isDev || !latest || current === latest) return;

    toast({
      title: "New release available",
      action: (
        <ToastAction altText="Set key" asChild>
          <a href="https://ethui.dev" target="_blank" rel="noreferrer">
            Download
          </a>
        </ToastAction>
      ),
    });
  }, [latest, current, enabled]);

  return null;
}

async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/ethui/ethui/releases?per_page=1",
  );
  const json = await response.json();
  return json[0].tag_name.replace("v", "");
}
