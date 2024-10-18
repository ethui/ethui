import { Button, Grid2 as Grid } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isDirty, isValid } from "zod";

import type { Erc20FullData } from "@ethui/types";
import { AddressView } from "#/components/AddressView";
import { Datapoint } from "#/components/Datapoint";
import { IconToken } from "#/components/Icons/Token";
import { useDialog } from "#/hooks/useDialog";
import { useNetworks } from "#/store/useNetworks";

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
    <div className="m-2 flex flex-col items-center">
      <h1 className="font-bold">Add suggested token</h1>
      <span className="text-center">
        This allows the following asset to be added to your wallet.
      </span>
      <Grid container rowSpacing={2}>
        <Datapoint
          label=""
          value={
            <div className="m-1 flex flex flex-col text-center">
              <IconToken iconUrl={token.alchemy_metadata.logo} />
              <span className="self-center">{token.metadata.name}</span>
            </div>
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

      <div className=" m-2 flex">
        <Button color="error" onClick={() => tauriWindow.close()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || !isValid}
          onClick={() => send("accept")}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
