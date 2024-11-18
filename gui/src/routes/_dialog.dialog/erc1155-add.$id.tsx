import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isDirty, isValid } from "zod";

import type { ErcFullData } from "@ethui/types";
import { Button } from "@ethui/ui/components/shadcn/button";
import { AddressView } from "#/components/AddressView";
import { Datapoint } from "#/components/Datapoint";
import { useDialog } from "#/hooks/useDialog";
import { useNetworks } from "#/store/useNetworks";

const tauriWindow = getCurrentWindow();

export const Route = createFileRoute("/_dialog/dialog/erc1155-add/$id")({
  component: ERC1155AddDialog,
});

function ERC1155AddDialog() {
  const { id } = Route.useParams();
  const { data: token, send } = useDialog<ErcFullData>(id);
  const network = useNetworks((s) => s.current);

  if (!network) return null;
  if (!token) return null;

  return (
    <div className="m-2 flex flex-col items-center">
      <h1 className="font-xl">Add suggested token</h1>
      <span className="text-center">
        This allows the following asset to be added to your wallet.
      </span>
      <div className="grid grid-cols-4 justify-center gap-5">
        <img
          alt="Token"
          height={400}
          src={token.image.originalUrl || "../public/default_nft.svg"}
        />
        <div>
          <Datapoint
            label="Contract Address"
            value={<AddressView address={token.contract.address} />}
          />
          <Datapoint label="Token ID" value={`#${Number(token.tokenId)}`} />
          <Datapoint label="Balance" value={`${Number(token.balance)}`} />
        </div>
        <Datapoint label="Name" value={token.raw.metadata.name || undefined} />
        <Datapoint
          label="Description"
          value={token.raw.metadata.description || undefined}
        />
      </div>

      <div className="m-2 flex flex-col">
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
