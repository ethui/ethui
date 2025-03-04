import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { map } from "lodash-es";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";

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

  useEventListener("peers-updated", refetch);

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
    <div className=" m-1 flex items-center gap-2">
      <img className="h-8 w-8" src={peers[0].favicon} alt={domain} />
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

  useEventListener("peers-updated", refetch);

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
      setCurrentNetwork(networks.find((n) => n.chain_id === current.sticky[0]));
    }
  }, [current, networks, currentGlobalNetwork]);

  // TODO: bug can't currently clear affinity
  const handleChange = (value: string) => {
    let affinity: Affinity = "global";
    if (value !== "global") {
      affinity = { sticky: [Number.parseInt(value), 0] };
    }
    invoke("connections_set_affinity", {
      domain,
      affinity,
    });
    setCurrent(affinity);
  };

  const value =
    current === "global" || current === "unset"
      ? "global"
      : current.sticky.toString();
  const isGlobal = current === "global" || current === "unset";

  return (
    <>
      <Select defaultValue={value} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue>
            {!isGlobal && currentNetwork ? (
              <ChainView
                chainId={currentNetwork.chain_id}
                name={currentNetwork.name}
              />
            ) : (
              "Global"
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            <SelectItem value="global">Global</SelectItem>
            {networks.map((network) => (
              <SelectItem
                value={network.chain_id.toString()}
                key={network.name}
              >
                <ChainView chainId={network.chain_id} name={network.name} />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
}
