import { Box, Stack, Typography } from "@mui/material";
import { groupBy, map } from "lodash";
import React from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshConnections } from "../hooks/useRefreshConnections";
import Panel from "./Panel";

interface Connection {
  origin: string;
  tab_id?: number;
  title?: string;
  socket: string;
  url: string;
  favicon: string;
}

export function Connections() {
  const { data: connections, mutate } =
    useInvoke<Connection[]>("get_connections");

  useRefreshConnections(mutate);

  const connectionsByTabId = groupBy(connections, "tab_id");

  return (
    <Panel>
      <Stack spacing={2}>
        {map(connectionsByTabId, (conns, tabId) => (
          <Connection key={tabId} tabId={tabId} conns={conns} />
        ))}
      </Stack>
    </Panel>
  );
}

function Connection({ tabId, conns }: { tabId?: string; conns: Connection[] }) {
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
        <Typography variant="body2">{conns.length} connections</Typography>
      </Stack>
    </Stack>
  );
}
