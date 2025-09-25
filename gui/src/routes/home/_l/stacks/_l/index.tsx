import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Database, LoaderCircle, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "#/components/EmptyState";
import { useInvoke } from "#/hooks/useInvoke";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/stacks/_l/")({
  beforeLoad: () => ({ breadcrumb: "Stacks" }),
  component: RouteComponent,
});

// Component to handle dynamic status checking for a single stack
function StackCard({ name }: { name: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">(
    "unknown",
  );

  const checkStatus = useCallback(async () => {
    try {
      const result = await invoke<string>("stacks_get_status", { slug: name });
      setStatus(result as "online" | "offline");
    } catch (_) {
      setStatus("offline");
    }
  }, [name]);

  useEffect(() => {
    checkStatus();
    // Check status every 25 seconds
    const interval = setInterval(checkStatus, 25000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <Link to={`/home/stacks/${name}`} className="border p-4 hover:bg-accent">
      <ChainView chainId={1} name={name} status={status} />
    </Link>
  );
}

function RouteComponent() {
  const { data: runtimeData, isLoading: runtimeLoading } = useInvoke<{
    running: boolean;
    error: boolean;
    state: string;
  }>(
    "stacks_get_runtime_state",
    {},
    {
      refetchInterval: ({ data }: { data: { running: boolean } | null }) =>
        data?.running ? false : 1000,
      refetchOnWindowFocus: false,
    },
  );

  const { data: stacks, isLoading: stacksLoading } =
    useInvoke<string[]>("stacks_list");
  const settings = useSettings((s) => s.settings);

  const [stacksEnabledInSettings, setStacksEnabledInSettings] = useState(
    settings?.runLocalStacks ?? false,
  );

  const {
    running: runtimeEnabled,
    error: runtimeError,
    state: runtimeState,
  } = runtimeData || { running: false, error: false, state: "" };

  if (!settings || runtimeLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (!stacksEnabledInSettings) {
    return (
      <div>
        <EmptyState
          message="Stacks are not enabled"
          description="You need to enable the stacks integration to use this feature!"
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              await invoke("settings_set", {
                params: { runLocalStacks: true },
              });
              setStacksEnabledInSettings(true);
            }}
          >
            <Database className="h-4 w-4" />
            Enable Stacks
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!runtimeEnabled) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (runtimeError) {
    return (
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-2 border p-4 align-baseline hover:bg-accent">
          <Form.Textarea
            name="runtimeState"
            value={runtimeState}
            readOnly
            className="w-full"
            placeholder="Runtime state information"
          />
        </div>
      </div>
    );
  }

  if (stacksLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (!stacks || stacks.length === 0) {
    return (
      <div>
        <EmptyState
          message="No stacks found"
          description="Add a new stack by clicking the button below"
        >
          <Link to="/home/stacks/new">
            <Button variant="outline" size="sm" className="gap-2">
              <Database className="h-4 w-4" />
              Add a new stack
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {stacks.map((name) => (
        <StackCard key={name} name={name} />
      ))}
      <Link
        to="/home/stacks/new"
        className="flex gap-2 border p-4 align-baseline hover:bg-accent"
      >
        <Plus />
        Add new
      </Link>
    </div>
  );
}
