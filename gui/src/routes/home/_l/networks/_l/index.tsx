import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Database, LoaderCircle, Plus } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { EmptyState } from "#/components/EmptyState";
import { WithHelpTooltip } from "#/components/WithHelpTooltip";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/networks/_l/")({
  beforeLoad: () => ({ breadcrumb: "Networks" }),
  component: () => <NetworksIndex />,
});

function NetworksIndex() {
  const networks = useNetworks(useShallow((s) => s.networks));
  const settings = useSettings((s) => s.settings);

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

  if (!networks || !settings || runtimeLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  const regularNetworks = networks.filter((network) => !network.is_stack);
  const stackNetworks = networks.filter((network) => network.is_stack);

  const {
    running: runtimeEnabled,
    error: runtimeError,
    state: runtimeState,
  } = runtimeData || { running: false, error: false, state: "" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 font-semibold text-lg">Chains</h2>
        <div className="flex flex-wrap gap-2">
          {regularNetworks.map(({ id: { chain_id }, name, status }) => (
            <Link
              to={`/home/networks/${name}/edit`}
              key={name}
              className="border p-4 hover:bg-accent"
            >
              <ChainView chainId={chain_id} name={name} status={status} />
            </Link>
          ))}
          <Link
            to="/home/networks/new"
            className="flex gap-2 border p-4 align-baseline hover:bg-accent"
          >
            <Plus />
            Add new
          </Link>
        </div>
      </div>

      <div>
        <WithHelpTooltip
          helpText="Local Stacks allows you to create local Anvil nodes in your docker."
          className="mb-4"
        >
          <h2 className="font-semibold text-lg">Local Stacks</h2>
        </WithHelpTooltip>

        {!settings.runLocalStacks ? (
          <div>
            <EmptyState
              message="You need to enable the local stacks service"
              className="mt-0 items-start"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  await invoke("settings_set", {
                    params: { runLocalStacks: true },
                  });
                }}
              >
                <Database className="h-4 w-4" />
                Enable
              </Button>
            </EmptyState>
          </div>
        ) : !runtimeEnabled ? (
          <div className="flex h-32 items-center justify-center">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : runtimeError ? (
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
        ) : (
          <div className="flex flex-wrap gap-2">
            {stackNetworks.map(({ id: { chain_id }, name, status }) => (
              <Link
                to={`/home/networks/stacks/${name}`}
                key={name}
                className="border p-4 hover:bg-accent"
              >
                <ChainView chainId={chain_id} name={name} status={status} />
              </Link>
            ))}
            <Link
              to="/home/networks/stacks/new"
              className="flex gap-2 border p-4 align-baseline hover:bg-accent"
            >
              <Plus />
              Add new
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
