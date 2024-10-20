import {
  Avatar,
  Badge,
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { createLazyFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { map } from "lodash-es";
import { useEffect, useState } from "react";

import { ChainView } from "@ethui/react/components/ChainView";
import type { Affinity, Peer } from "@ethui/types";
import { AppNavbar } from "#/components/AppNavbar";
import { Panel } from "#/components/Panel";
import { useEventListener } from "#/hooks/useEventListener";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";

export const Route = createLazyFileRoute("/_home/home/connections")({
  component: Connections,
});

export function Connections() {
  const { data: peersByDomain, refetch } =
    useInvoke<Record<string, Peer[]>>("ws_peers_by_domain");

  useEventListener("peers-updated", refetch);

  return (
    <>
      <AppNavbar title="Connections" />
      <Panel>
        <div className="m-1 flex flex-col">
          {map(peersByDomain, (peers, domain) => (
            <Domain key={domain} domain={domain} peers={peers} />
          ))}
        </div>
      </Panel>
    </>
  );
}

function Domain({ domain, peers }: { domain: string; peers: Peer[] }) {
  return (
    <div className=" m-1 flex items-center">
      <Badge>
        <Avatar sx={{ width: 30, height: 30 }} src={peers[0].favicon}>
          {peers[0].origin.replace(/https?:\/\//, "").slice(0, 2)}
        </Avatar>
      </Badge>
      <span> {peers[0].origin}</span>
      <div>
        <AffinityForm domain={domain} />
      </div>
    </div>
  );
}

function AffinityForm({ domain }: { domain: string }) {
  const networks = useNetworks((s) => s.networks);
  const { data: affinity, refetch } = useInvoke<Affinity>(
    "connections_affinity_for",
    {
      domain,
    },
  );

  useEventListener("peers-updated", refetch);

  const [current, setCurrent] = useState<Affinity>("global");

  useEffect(() => {
    setCurrent(affinity || "global");
  }, [affinity]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    let affinity: Affinity = "global";
    if (event.target.value !== "global") {
      affinity = { sticky: Number.parseInt(event.target.value) };
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

  return (
    <FormControl fullWidth variant="standard">
      <Select
        labelId="network-select-label"
        label="Network"
        size="small"
        onChange={handleChange}
        value={value}
        displayEmpty
      >
        <MenuItem value="global">
          <em>Global</em>
        </MenuItem>
        {networks.map((network) => (
          <MenuItem value={network.chain_id} key={network.name}>
            <ChainView chainId={network.chain_id} name={network.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
