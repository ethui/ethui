import type { Affinity, Peer } from "@ethui/types";
import type { Network } from "@ethui/types/network";
import { ChainView } from "@ethui/ui/components/chain-view";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/shadcn/select";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { map } from "lodash-es";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { EmptyState } from "#/components/EmptyState";
import { useEventListener } from "#/hooks/useEventListener";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/connections")({
  beforeLoad: () => ({
    breadcrumb: "Connections",
  }),
  component: Connections,
});

function Connections() {
  const { data: peersByDomain, refetch } =
    useInvoke<Record<string, Peer[]>>("ws_peers_by_domain");

  useEventListener({ event: "peers-updated", callback: refetch });

  const hasConnections = peersByDomain && Object.keys(peersByDomain).length > 0;

  if (!hasConnections) {
    return (
      <EmptyState
        message="No connections found"
        description="Connect to dApps to see them here."
      />
    );
  }

  return (
    <div className="m-1 flex flex-col">
      {map(peersByDomain, (peers, domain) => (
        <Domain key={domain} domain={domain} peers={peers} />
      ))}
    </div>
  );
}

function Domain({ domain, peers }: { domain: string; peers: Peer[] }) {
  return (
    <div className="m-1 flex items-center gap-2">
      <span> {peers[0].origin}</span>
      <div>
        <AffinityForm domain={domain} />
      </div>
    </div>
  );
}

function AffinityForm({ domain }: { domain: string }) {
  const [networks, currentGlobalNetwork] = useNetworks(
    useShallow((s) => [s.networks, s.current]),
  );
  const { data: affinity, refetch } = useInvoke<Affinity>(
    "connections_affinity_for",
    {
      domain,
    },
  );

  useEventListener({ event: "peers-updated", callback: refetch });

  const [current, setCurrent] = useState<Affinity>("global");
  const [currentNetwork, setCurrentNetwork] = useState<Network | undefined>(
    currentGlobalNetwork,
  );

  useEffect(() => {
    setCurrent(affinity || "global");
  }, [affinity]);

  useEffect(() => {
    if (current === "global" || current === "unset") {
      setCurrentNetwork(currentGlobalNetwork);
    } else {
      setCurrentNetwork(
        networks.find(
          (n) =>
            n.id.chain_id === current.sticky.chain_id &&
            n.id.dedup_id === current.sticky.dedup_id,
        ),
      );
    }
  }, [current, networks, currentGlobalNetwork]);

  const handleChange = (value: string) => {
    const selection = JSON.parse(value);

    let affinity: Affinity = "global";
    if (selection !== "global") {
      affinity = { sticky: selection };
    }
    invoke("connections_set_affinity", {
      domain,
      affinity,
    });
    setCurrent(affinity);
  };

  const value = JSON.stringify(
    current === "global" || current === "unset" ? "global" : current.sticky,
  );
  const isGlobal = current === "global" || current === "unset";

  return (
    <Select defaultValue={JSON.parse(value)} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue>
          {!isGlobal && currentNetwork ? (
            <ChainView
              chainId={currentNetwork.id.chain_id}
              name={currentNetwork.name}
            />
          ) : (
            "Global"
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          <SelectItem value={JSON.stringify("global")}>Global</SelectItem>
          {networks.map((network) => (
            <SelectItem value={JSON.stringify(network.id)} key={network.name}>
              <ChainView chainId={network.id.chain_id} name={network.name} />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
