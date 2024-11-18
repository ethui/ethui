import { createLazyFileRoute, Link } from "@tanstack/react-router";

import { useShallow } from "zustand/shallow";

import { ChainView } from "@ethui/ui/components/chain-view";
import { AppNavbar } from "#/components/AppNavbar";
import { useNetworks } from "#/store/useNetworks";
import { Button } from "@ethui/ui/components/shadcn/button";

export const Route = createLazyFileRoute("/_home/home/settings/networks/")({
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
      </div>
      <div>
        <Button asChild>
          <Link href="/home/settings/networks/new">Add network</Link>
        </Button>
      </div>
    </div>
  );
}
