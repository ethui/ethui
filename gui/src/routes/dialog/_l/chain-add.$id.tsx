import { ChainView } from "@ethui/ui/components/chain-view";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Datapoint } from "#/components/Datapoint";
import { DialogBottom } from "#/components/Dialogs/Bottom";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/dialog/_l/chain-add/$id")({
  component: ChainAddDialog,
});

interface NewNetworkParams {
  name: string;
  chain_id: number;
  explorer_url?: string;
  http_url: string;
  ws_url?: string;
  currency: string;
  decimals: number;
}

function ChainAddDialog() {
  const { id } = Route.useParams();
  const { data: network, send } = useDialog<NewNetworkParams>(id);

  if (!network) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full items-stretch justify-center self-center">
        <h1 className="font-xl">Add new network</h1>
      </div>

      <ChainView chainId={network.chain_id} name={network.name} />

      <div className="grid grid-cols-4 gap-5">
        <Datapoint
          label="Chain ID"
          value={network.chain_id}
          className="col-span-2"
        />
        <Datapoint
          label="Currency"
          value={network.currency}
          className="col-span-2"
        />
        <Datapoint
          label="Decimals"
          value={network.decimals}
          className="col-span-2"
        />
        <Datapoint
          className="col-span-4"
          label="RPC (HTTP)"
          value={network.http_url}
        />
        {network.ws_url && (
          <Datapoint
            className="col-span-4"
            label="RPC (WS)"
            value={network.ws_url}
          />
        )}
        {network.explorer_url && (
          <Datapoint
            className="col-span-4"
            label="Explorer"
            value={network.explorer_url}
          />
        )}
      </div>

      <DialogBottom>
        <div className="m-2 flex items-center justify-center gap-2">
          <Button
            variant="destructive"
            onClick={() => getCurrentWebviewWindow().close()}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={() => send("accept")}>
            Add
          </Button>
        </div>
      </DialogBottom>
    </div>
  );
}
