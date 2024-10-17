import { Button, Grid2 as Grid, Stack, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isDirty, isValid } from "zod";

import { ChainView } from "@ethui/react/components/ChainView";
import type { Network } from "@ethui/types/network";
import { Datapoint } from "#/components/Datapoint";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/_dialog/dialog/chain-add/$id")({
  component: ChainAddDialog,
});

export function ChainAddDialog() {
  const { id } = Route.useParams();
  const { data: network, send } = useDialog<Network>(id);

  if (!network) return null;

  return (
    <Stack spacing={2} alignItems="center">
      <Typography variant="h6" component="h1">
        Add new network?
      </Typography>

      <ChainView chainId={network.chain_id} name={network.name} />

      <Grid container rowSpacing={2}>
        <Datapoint label="Chain ID" value={network.chain_id} />
        <Datapoint size="small" label="Currency" value={network.currency} />
        <Datapoint size="small" label="Decimals" value={network.decimals} />
        <Datapoint size="small" label="Decimals" value={network.decimals} />
        <Datapoint label="RPC (HTTP)" value={network.http_url} />
        {network.ws_url && (
          <Datapoint label="RPC (WS)" value={network.ws_url} />
        )}
        {network.explorer_url && (
          <Datapoint label="Explorer" value={network.explorer_url} />
        )}
      </Grid>

      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="error"
          onClick={() => getCurrentWebviewWindow().close()}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
          onClick={() => send("accept")}
        >
          Add
        </Button>
      </Stack>
    </Stack>
  );
}
