import { Box, Stack, Typography } from "@mui/material";
import { groupBy, map } from "lodash";

import { useInvoke } from "../hooks/tauri";
import { useRefreshPeers } from "../hooks/useRefreshPeers";
import Panel from "./Panel";

interface Peer {
  origin: string;
  tab_id?: number;
  title?: string;
  socket: string;
  url: string;
  favicon: string;
}

export function Peers() {
  const { data: peers, mutate } = useInvoke<Peer[]>("peers_get_all");

  useRefreshPeers(mutate);

  const peersByTabId = groupBy(peers, "tab_id");

  return (
    <Panel>
      <Stack spacing={2}>
        {map(peersByTabId, (conns, tabId) => (
          <Connection key={tabId} tabId={tabId} conns={conns} />
        ))}
      </Stack>
    </Panel>
  );
}

function Connection({ tabId, conns }: { tabId?: string; conns: Peer[] }) {
  return (
    <Stack direction="row" spacing={2}>
      <Box
        component="img"
        src={conns[0].favicon}
        sx={{ width: 24, height: 24, mt: 1 }}
      />
      <Stack>
        <Typography variant="overline"> {conns[0].title}</Typography>
        {tabId && <Typography variant="body2">Tab ID {tabId}</Typography>}
        <Typography variant="body2">{conns.length} peers</Typography>
      </Stack>
    </Stack>
  );
}
