import { ChainView } from "@ethui/ui/components/chain-view";
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
    // Check status every 10 seconds
    const interval = setInterval(checkStatus, 10000);
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
  const { data: stacks } = useInvoke<string[]>("stacks_list");

  if (!stacks) return "Loading";

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
