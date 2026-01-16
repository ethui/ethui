import type { Network } from "@ethui/types/network";
import { ClickToCopy } from "@ethui/ui/components/click-to-copy";
import { Form } from "@ethui/ui/components/form";
import { ChainIcon } from "@ethui/ui/components/icons/chain";
import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ethui/ui/components/shadcn/tooltip";
import { Table } from "@ethui/ui/components/table";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import { Database, Globe, LoaderCircle, Pencil, Plus } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { EmptyState } from "#/components/EmptyState";
import { WithHelpTooltip } from "#/components/WithHelpTooltip";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { useSettings } from "#/store/useSettings";
import { formatExplorerUrl } from "#/utils";

const columnHelper = createColumnHelper<Network>();

function NetworksTable({
  networks,
  editPath,
}: {
  networks: Network[];
  editPath: (name: string) => string;
}) {
  const columns = [
    columnHelper.display({
      id: "chain",
      header: "Chain",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ChainIcon
            className="shrink-0"
            chainId={row.original.id.chain_id}
            status={row.original.status}
          />
          <span className="truncate font-medium">{row.original.name}</span>
          <Badge variant="outline" className="shrink-0 font-mono text-xs">
            {row.original.id.chain_id}
          </Badge>
        </div>
      ),
    }),
    columnHelper.display({
      id: "rpc",
      header: "RPC(s)",
      cell: ({ row }) => {
        const { http_url, ws_url } = row.original;
        if (!http_url && !ws_url) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-col gap-1 py-1">
            {http_url ? (
              <ClickToCopy text={http_url}>
                <span className="cursor-pointer font-mono text-muted-foreground text-xs hover:text-foreground">
                  {http_url}
                </span>
              </ClickToCopy>
            ) : (
              <span className="font-mono text-muted-foreground/50 text-xs">
                -
              </span>
            )}
            {ws_url ? (
              <ClickToCopy text={ws_url}>
                <span className="cursor-pointer font-mono text-muted-foreground text-xs hover:text-foreground">
                  {ws_url}
                </span>
              </ClickToCopy>
            ) : (
              <span className="font-mono text-muted-foreground/50 text-xs">
                -
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "currency",
      header: "Currency",
      size: 70,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.currency}
          <span className="ml-1 text-muted-foreground text-xs">
            ({row.original.decimals}d)
          </span>
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      size: 80,
      cell: ({ row }) => {
        const explorerUrl =
          row.original.explorer_url ??
          formatExplorerUrl(row.original.ws_url, row.original.http_url);
        return (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to={editPath(row.original.name)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            {explorerUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Open Explorer</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    }),
  ];

  return (
    <Table
      columns={columns}
      data={networks}
      variant="secondary"
      className="table-auto"
    />
  );
}

export const Route = createFileRoute("/home/_l/networks/_l/")({
  beforeLoad: () => ({ breadcrumb: "Networks" }),
  component: () => <NetworksIndex />,
});

function NetworksIndex() {
  const networks = useNetworks(useShallow((s) => s.networks));
  const settings = useSettings((s) => s.settings);

  const { data: isStacksEnabled } = useInvoke<boolean>("is_stacks_enabled");

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
      enabled: isStacksEnabled,
    },
  );

  if (!networks || !settings || (isStacksEnabled && runtimeLoading)) {
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Chains</h2>
          <Link to="/home/networks/new">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Chain
            </Button>
          </Link>
        </div>
        {regularNetworks.length > 0 ? (
          <NetworksTable
            networks={regularNetworks.reverse()}
            editPath={(name) => `/home/networks/${name}/edit`}
          />
        ) : (
          <EmptyState message="No chains configured" />
        )}
      </div>

      {isStacksEnabled && (
        <div>
          <WithHelpTooltip
            text="Local Stacks allows you to create local Anvil nodes in your docker."
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
            <>
              <div className="mb-4 flex justify-end">
                <Link to="/home/networks/stacks/new">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Stack
                  </Button>
                </Link>
              </div>
              {stackNetworks.length > 0 ? (
                <NetworksTable
                  networks={stackNetworks}
                  editPath={(name) => `/home/networks/stacks/${name}`}
                />
              ) : (
                <EmptyState message="No local stacks configured" />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
