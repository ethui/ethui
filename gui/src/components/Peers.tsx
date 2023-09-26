import {
  Badge,
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { map } from "lodash-es";
import { useEffect, useState } from "react";

import { useEventListener, useInvoke } from "../hooks";
import { useNetworks } from "../store";
import { Affinity } from "../types";
import { Panel } from "./";

interface Peer {
  origin: string;
  tab_id?: number;
  title?: string;
  socket: string;
  url: string;
  favicon: string;
}

export function Peers() {
  const { data: peersByDomain, mutate } =
    useInvoke<Record<string, Peer[]>>("ws_peers_by_domain");

  useEventListener("peers-updated", mutate);

  return (
    <Panel>
      <Stack spacing={2}>
        {map(peersByDomain, (peers, domain) => (
          <Domain key={domain} domain={domain} peers={peers} />
        ))}
      </Stack>
    </Panel>
  );
}

function Domain({ domain, peers }: { domain: string; peers: Peer[] }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Badge>
        <img width="30" height="30" src={peers[0].favicon} />
      </Badge>
      <Typography> {peers[0].origin}</Typography>
      <Box sx={{ "&&": { ml: "auto" } }}>
        <AffinityForm domain={domain} />
      </Box>
    </Stack>
  );
}

function AffinityForm({ domain }: { domain: string }) {
  const networks = useNetworks((s) => s.networks);
  const { data: affinity, mutate } = useInvoke<Affinity>(
    "connections_affinity_for",
    {
      domain,
    },
  );

  useEventListener("peers-updated", mutate);

  const [current, setCurrent] = useState<Affinity>("global");

  useEffect(() => {
    setCurrent(affinity || "global");
  }, [affinity]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    let affinity: Affinity = "global";
    if (event.target.value !== "global") {
      affinity = { sticky: parseInt(event.target.value) };
    }
    invoke("connections_set_affinity", {
      domain,
      affinity,
    });
    setCurrent(affinity);
  };

  const value =
    current == "global" || current == "unset"
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
            {network.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
