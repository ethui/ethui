import { ChainView } from "@ethui/ui/components/chain-view";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/settings/_l/networks/_l/")({
  beforeLoad: () => ({ breadcrumb: "Networks" }),
  component: () => <SettingsNetworks />,
});

function SettingsNetworks() {
  const networks = useNetworks(useShallow((s) => s.networks));

  if (!networks) return "Loading";

  const regularNetworks = networks.filter((network) => !network.is_stack);
  const stackNetworks = networks.filter((network) => network.is_stack);

  // TODO: add network button
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 font-semibold text-lg">Networks</h2>
        <div className="flex flex-wrap gap-2">
          {regularNetworks.map(({ id: { chain_id }, name, status }) => (
            <Link
              to={`/home/settings/networks/${name}/edit`}
              key={name}
              className="border p-4 hover:bg-accent"
            >
              <ChainView chainId={chain_id} name={name} status={status} />
            </Link>
          ))}
          <Link
            to="/home/settings/networks/new"
            className="flex gap-2 border p-4 align-baseline hover:bg-accent"
          >
            <Plus />
            Add new
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-semibold text-lg">Stacks</h2>
        <div className="flex flex-wrap gap-2">
          {stackNetworks.map(({ id: { chain_id }, name, status }) => (
            <div
              key={name}
              className="cursor-not-allowed border p-4 opacity-60"
              title="Stacks are managed in the Stacks tab"
            >
              <ChainView chainId={chain_id} name={name} status={status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
