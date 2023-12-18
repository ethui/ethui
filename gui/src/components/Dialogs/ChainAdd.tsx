import { Stack, Typography, Button, Grid } from "@mui/material";
import { isDirty, isValid } from "zod";
import { window as tauriWindow } from "@tauri-apps/api";

import { Network } from "@iron/types/network";
import { ChainView } from "@iron/components";
import { useDialog } from "@/hooks";
import { Datapoint } from "@/components";
import { DialogLayout } from "./Layout";

export function ChainAddDialog({ id }: { id: number }) {
  const { data: network, send } = useDialog<Network>(id);

  if (!network) return null;

  return (
    <DialogLayout>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" component="h1">
          Add new network?
        </Typography>

        <ChainView chainId={network.chain_id} name={network.name} />

        <Grid container rowSpacing={2}>
          <Datapoint label="Chain ID" value={network.chain_id} />
          <Datapoint short label="Currency" value={network.currency} />
          <Datapoint short label="Decimals" value={network.decimals} />
          <Datapoint short label="Decimals" value={network.decimals} />
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
            onClick={() => tauriWindow.appWindow.close()}
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
    </DialogLayout>
  );
}
