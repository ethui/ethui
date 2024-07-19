import { createFileRoute } from "@tanstack/react-router";
import { Stack, Typography, Button, Grid } from "@mui/material";
import { isDirty, isValid } from "zod";
import { window as tauriWindow } from "@tauri-apps/api";
import { Address } from "viem";

import { useDialog } from "@/hooks";
import { AddressView, Datapoint } from "@/components";
import { useNetworks } from "@/store";

export const Route = createFileRoute("/_dialog/dialog/erc721-add/$id")({
  component: ERC721AddDialog,
});

export interface ERC721Data {
  address: Address;
  token_id: number;
}

export function ERC721AddDialog() {
  const { id } = Route.useParams();
  const { data: token, send } = useDialog<ERC721Data>(id);
  const network = useNetworks((s) => s.current);

  if (!network) return null;
  if (!token) return null;

  return (
    <Stack spacing={2} alignItems="center">
      <Typography variant="h6" component="h1">
        Add suggested NFT
      </Typography>
      <Typography textAlign={"center"}>
        This allows the following asset to be added to your wallet.
      </Typography>
      <Grid container rowSpacing={2}>
        <Datapoint
          label="Token Address"
          value={<AddressView address={token.address} />}
        />

        <Datapoint label="Token ID" value={`#${Number(token.token_id)}`} />
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
