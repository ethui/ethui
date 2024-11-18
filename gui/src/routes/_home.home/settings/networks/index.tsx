import { Link, createFileRoute } from "@tanstack/react-router";

import { useShallow } from "zustand/shallow";

import { ChainView } from "@ethui/ui/components/chain-view";
import { AppNavbar } from "#/components/AppNavbar";
import { useNetworks } from "#/store/useNetworks";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_home/home/settings/networks/")({
  component: () => (
    <>
      <AppNavbar title="Settings » Networks" />
      <div className="m-4">
        <SettingsNetworks />
      </div>
    </>
  ),
});

function SettingsNetworks() {
  const networks = useNetworks(useShallow((s) => s.networks));

  if (!networks) return <>Loading</>;

  // TODO: add network button
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        {networks.map(({ chain_id, name }) => (
          <Link
            href={`/home/settings/networks/${name}/edit`}
            key={name}
            className="border p-4 hover:bg-accent"
          >
            <ChainView chainId={chain_id} name={name} />
          </Link>
        ))}
        <Link
          href="/home/settings/networks/new"
          className="border p-4 hover:bg-accent flex align-baseline gap-2"
        >
          <Plus />
          Add new
        </Link>
      </div>
    </div>
  );
}
