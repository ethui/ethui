import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { createFileRoute } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { useInvoke } from "#/hooks/useInvoke";

export const Route = createFileRoute("/home/_l/settings/_l/about")({
  component: RouteComponent,
});

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'error';

function RouteComponent() {
  const { data: version } = useInvoke<string>("get_version");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');

  const isMacos = platform() === "macos";
  const isDev = import.meta.env.MODE === "development";
  const canAutoUpdate = isMacos || isDev;

  const handleCheckForUpdates = async () => {
    setUpdateStatus('checking');

    try {
      if (canAutoUpdate) {
        // Use the auto-updater system for macOS and development builds
        const updateFound = await invoke<boolean>("trigger_updater");
        if (updateFound) {
          // Don't change status - the original toast will trigger and button will be replaced by checkbox
          // The update notification system will handle the UI changes
          return;
        } else {
          setUpdateStatus('up-to-date');
        }
      } else {
        // For other platforms, check GitHub API manually
        const response = await fetch(
          "https://api.github.com/repos/ethui/ethui/releases?per_page=1",
        );
        const json = await response.json();
        const latestVersion = json[0].tag_name.replace("v", "");

        if (version === latestVersion) {
          setUpdateStatus('up-to-date');
        } else {
          toast({
            title: "New version available",
            description: `Version ${latestVersion} is available for download.`,
            action: (
              <a href="https://ethui.dev" target="_blank" rel="noreferrer">
                Download
              </a>
            ),
          });
          setUpdateStatus('up-to-date'); // Reset after showing toast
        }
      }
    } catch (_error) {
      setUpdateStatus('error');
    }
  };

  return (
    <div className="w-full space-y-4">
      <ul>
        <li>ethui {version}</li>
      </ul>

      {updateStatus === 'idle' && (
        <Button
          onClick={handleCheckForUpdates}
          variant="outline"
        >
          Check for updates
        </Button>
      )}
      
      {updateStatus === 'checking' && (
        <Button disabled variant="outline">
          Checking...
        </Button>
      )}
      
      {updateStatus === 'up-to-date' && (
        <div className="flex items-center text-sm text-muted-foreground">
          ✓ You're up to date
        </div>
      )}
      
      {updateStatus === 'error' && (
        <div className="flex items-center text-sm text-muted-foreground">
          ✗ Error checking for updates
        </div>
      )}
    </div>
  );
}
