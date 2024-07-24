import { createFileRoute } from "@tanstack/react-router";
import { Stack, Typography, Button, Grid } from "@mui/material";
import { isDirty, isValid } from "zod";
import { window as tauriWindow } from "@tauri-apps/api";

import { Erc20FullData } from "@ethui/types";
import { useDialog } from "@/hooks";
import { AddressView, Datapoint } from "@/components";
import { useNetworks } from "@/store";
import { IconToken } from "@/components/Icons";

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
        This allows the following token to be added to your wallet.
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
  );
}
