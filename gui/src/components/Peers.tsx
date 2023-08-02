import { Badge, Box, Stack, Typography } from "@mui/material";
import { groupBy, map } from "lodash-es";

import { useInvoke, useRefreshPeers } from "../hooks";
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
  const { data: peers, mutate } = useInvoke<Peer[]>("ws_get_all_peers");

  useRefreshPeers(mutate);

  const peersByTabId = groupBy(peers, "tab_id");

  return (
    <Panel>
      <Stack spacing={2}>
        {map(peersByTabId, (conns, tabId) => (
          <Connection key={tabId} conns={conns} />
        ))}
      </Stack>
    </Panel>
  );
}

function Connection({ conns }: { conns: Peer[] }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Badge>
        <img width="30" height="30" src={conns[0].favicon} />
      </Badge>
      <Stack>
        <Typography> {conns[0].title}</Typography>
      </Stack>
    </Stack>
  );
}
