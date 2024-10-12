import { Button, Grid, Stack, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isDirty, isValid } from "zod";

import type { Erc20FullData } from "@ethui/types";
import { AddressView, Datapoint } from "#/components";
import { IconToken } from "#/components/Icons";
import { useDialog } from "#/hooks";
import { useNetworks } from "#/store";

const tauriWindow = getCurrentWindow();

export const Route = createFileRoute("/_dialog/dialog/erc20-add/$id")({
  component: ERC20AddDialog,
});

export function ERC20AddDialog() {
  const { id } = Route.useParams();
  const { data: token, send } = useDialog<Erc20FullData>(id);
  const network = useNetworks((s) => s.current);

  if (!network) return null;
  if (!token) return null;

  return (
    <Stack spacing={2} alignItems="center">
      <Typography variant="h6" component="h1">
        Add suggested token
      </Typography>
      <Typography textAlign={"center"}>
        This allows the following asset to be added to your wallet.
      </Typography>
      <Grid container rowSpacing={2}>
        <Datapoint
          label=""
          value={
            <Stack direction="row" spacing={1.5} textAlign="center">
              <IconToken iconUrl={token.alchemy_metadata.logo} />
              <Typography alignSelf={"center"}>
                {token.metadata.name}
              </Typography>
            </Stack>
          }
        />
        <Datapoint size="small" label="Symbol" value={token.metadata.symbol} />
        <Datapoint
          size="small"
          label="Decimals"
          value={token.metadata.decimals}
        />
        <Datapoint
          label="Address"
          value={<AddressView address={token.metadata.address} />}
        />
      </Grid>

      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="error"
          onClick={() => tauriWindow.close()}
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
