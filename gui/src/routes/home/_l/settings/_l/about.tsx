import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { createFileRoute } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
import { useState } from "react";
import { useInvoke } from "#/hooks/useInvoke";

export const Route = createFileRoute("/home/_l/settings/_l/about")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: version } = useInvoke<string>("get_version");
  const checkForUpdatesManual = useInvoke<void>("check_for_updates_manual");
  const [isChecking, setIsChecking] = useState(false);

  const isMacos = platform() === "macos";
  const isDev = import.meta.env.MODE === "development";
  const canAutoUpdate = isMacos || isDev;

  const handleCheckForUpdates = async () => {
    setIsChecking(true);

    try {
      if (canAutoUpdate) {
        // Use the auto-updater system for macOS and development builds
        await checkForUpdatesManual.call();
        toast({
          title: "Checking for updates...",
          description: "You'll be notified if an update is available.",
        });
      } else {
        // For other platforms, check GitHub API manually
        const response = await fetch(
          "https://api.github.com/repos/ethui/ethui/releases?per_page=1",
        );
        const json = await response.json();
        const latestVersion = json[0].tag_name.replace("v", "");

        if (version === latestVersion) {
          toast({
            title: "You're up to date!",
            description: `ethui ${version} is the latest version.`,
          });
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
        }
      }
    } catch (_error) {
      toast({
        title: "Error checking for updates",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <ul>
        <li>ethui {version}</li>
      </ul>

      <Button
        onClick={handleCheckForUpdates}
        disabled={isChecking}
        variant="outline"
      >
        {isChecking ? "Checking..." : "Check for updates"}
      </Button>
    </div>
  );
}
