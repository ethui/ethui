import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  const { data: runtimeData } = useInvoke<[boolean, boolean, string]>(
    "stacks_get_runtime_state",
  );
  const { data: stacks, isLoading: stacksLoading } =
    useInvoke<string[]>("stacks_list");

  const [enabled, timeError, runtimeState] = runtimeData || [false, false, ""];

  if (!enabled) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          to="/home/settings/general"
          className="flex gap-2 border p-4 align-baseline hover:bg-accent"
        >
          You need to enable the stacks integration to use this feature !
        </Link>
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
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-2 border p-4 align-baseline">
          Loading stacks...
        </div>
      </div>
    );
  }

  if (!stacks || stacks.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-2 border p-4 align-baseline">
          No stacks found.
          <Link to="/home/stacks/new" className="text-blue-500 hover:underline">
            Create your first stack
          </Link>
        </div>
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
