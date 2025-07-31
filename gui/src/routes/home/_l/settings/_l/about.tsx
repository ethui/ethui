import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { useState } from "react";
import { useInvoke } from "#/hooks/useInvoke";

export const Route = createFileRoute("/home/_l/settings/_l/about")({
  component: RouteComponent,
});

async function getLatestVersion() {
  const response = await fetch(
    "https://api.github.com/repos/ethui/ethui/releases?per_page=1",
  );
  const json = await response.json();
  return json[0].tag_name.replace("v", "");
}

function RouteComponent() {
  const { data: version } = useInvoke<string>("get_version");
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const latestVersion = await getLatestVersion();
      
      if (version === latestVersion) {
        toast({
          title: "You're up to date!",
          description: `ethui ${version} is the latest version.`,
        });
      } else {
        toast({
          title: "New version available",
          description: `Version ${latestVersion} is available. You have ${version}.`,
          action: (
            <a
              href="https://ethui.dev"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Download
            </a>
          ),
        });
      }
    } catch (error) {
      toast({
        title: "Update check failed",
        description: "Could not check for updates. Please try again later.",
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
