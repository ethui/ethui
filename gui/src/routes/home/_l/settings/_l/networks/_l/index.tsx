import { Link, createFileRoute } from "@tanstack/react-router";

import { useShallow } from "zustand/shallow";

import { ChainView } from "@ethui/ui/components/chain-view";
import { Plus } from "lucide-react";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/settings/_l/networks/_l/")({
  beforeLoad: () => ({ breadcrumb: "Networks" }),
  component: () => <SettingsNetworks />,
});

function SettingsNetworks() {
  const networks = useNetworks(useShallow((s) => s.networks));

  if (!networks) return <>Loading</>;

  // TODO: add network button
  return (
    <div className="flex flex-wrap gap-2">
      {networks.map(({ dedup_chain_id: { chain_id }, name }) => (
        <Link
          to={`/home/settings/networks/${name}/edit`}
          key={name}
          className="border p-4 hover:bg-accent"
        >
          <ChainView chainId={chain_id} name={name} />
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
  );
}
