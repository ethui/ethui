import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Database, LoaderCircle, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "#/components/EmptyState";
import { useInvoke } from "#/hooks/useInvoke";

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
    <Link
      to={`/home/stacks/${name}/edit`}
      className="border p-4 hover:bg-accent"
    >
      <ChainView chainId={1} name={name} status={status} />
    </Link>
  );
}

function RouteComponent() {
  const { data: runtimeData } = useInvoke<{ running: boolean, error: boolean, state: string }>("stacks_get_runtime_state");

  const { data: stacks, isLoading: stacksLoading } =
    useInvoke<string[]>("stacks_list");

  const { running: enabled, error: timeError, state: runtimeState } = runtimeData || { running: false, error: false, state: "" };

  if (!enabled) {
    return (
      <div>
        <EmptyState
          message="Stacks are not enabled"
          description="You need to enable the stacks integration to use this feature !"
        >
          <Link to="/home/settings/general">
            <Button variant="outline" size="sm" className="gap-2">
              <Database className="h-4 w-4" />
              Enable Stacks
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (timeError) {
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
