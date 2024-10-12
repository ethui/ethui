import { Button, Grid, Stack, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isDirty, isValid } from "zod";

import { AddressView, Datapoint } from "@/components";
import { useDialog } from "@/hooks";
import { useNetworks } from "@/store";
import type { ErcFullData } from "@ethui/types";

const tauriWindow = getCurrentWindow();

export const Route = createFileRoute("/_dialog/dialog/erc1155-add/$id")({
  component: ERC1155AddDialog,
});

export function ERC1155AddDialog() {
  const { id } = Route.useParams();
  const { data: token, send } = useDialog<ErcFullData>(id);
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
      <Grid container rowSpacing={1} justifyItems={"center"}>
        <Grid container justifyContent={"center"} sx={{ mb: 2 }}>
          <img
            alt="Token"
            height={400}
            src={token.image.originalUrl || "../public/default_nft.svg"}
          />
        </Grid>
        <Grid container spacing={4}>
          <Grid item>
            <Datapoint
              label="Contract Address"
              value={<AddressView address={token.contract.address} />}
            />
          </Grid>
          <Grid item>
            <Datapoint label="Token ID" value={`#${Number(token.tokenId)}`} />
          </Grid>
          <Grid item>
            <Datapoint label="Balance" value={`${Number(token.balance)}`} />
          </Grid>
        </Grid>
        <Datapoint label="Name" value={token.raw.metadata.name || undefined} />
        <Datapoint
          label="Description"
          value={token.raw.metadata.description || undefined}
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
