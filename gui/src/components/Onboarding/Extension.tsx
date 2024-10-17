import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@ethui/ui/components/shadcn/alert";
import { useEffect, useState } from "react";

import { Button } from "@ethui/ui/components/shadcn/button";
import { useInvoke } from "#/hooks/useInvoke";
import type { StepProps } from ".";

export function InstallExtensionStep({ onSubmit }: StepProps) {
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
    <div className="m-2 flex w-full flex-col">
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
            <LoaderCircle className="animate-spin" />{" "}
            <AlertDescription>Waiting...</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>Extension detected!</AlertDescription>
          </Alert>
        )}
      </div>

      <div className=" self-end">
        <Button onClick={onSubmit} disabled={!detected}>
          {detected ? "Next" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
