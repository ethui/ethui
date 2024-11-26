import { Alert, AlertDescription } from "@ethui/ui/components/shadcn/alert";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@ethui/ui/components/shadcn/button";
import { useInvoke } from "#/hooks/useInvoke";

export const Route = createFileRoute("/onboarding/_l/extension")({
  component: OnboardingExtension,
});

function OnboardingExtension() {
  const [detected, setDetected] = useState<boolean>(false);

  const { data: peerCount } = useInvoke<number>(
    "ws_peer_count",
    {},
    {
      refetchInterval: 200,
    },
  );

  useEffect(() => {
    if (detected) return;
    setDetected(!!peerCount && peerCount > 0);
  }, [detected, peerCount]);

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="self-start text-xl">Install Extension</h1>

      <span>
        Go to{" "}
        <a
          className="underline"
          href="http://ethui.dev/onboarding/extension"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          this page
        </a>{" "}
        to install the ethui extension.
      </span>

      <div className="self-stretch">
        {!detected ? (
          <Alert>
            <AlertDescription className="flex gap-2 align-baseline">
              <LoaderCircle className="animate-spin" /> Waiting...
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>Extension detected!</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="self-center">
        <Button
          asChild
          disabled={!detected}
          variant={detected ? "default" : "ghost"}
        >
          <Link to="/onboarding/thank-you">Next</Link>
        </Button>
      </div>
    </div>
  );
}
