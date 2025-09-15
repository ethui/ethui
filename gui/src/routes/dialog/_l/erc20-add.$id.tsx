import type { Erc20FullData } from "@ethui/types";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AddressView } from "#/components/AddressView";
import { Datapoint } from "#/components/Datapoint";
import { IconAddress } from "#/components/Icons/Address";
import { useDialog } from "#/hooks/useDialog";
import { useNetworks } from "#/store/useNetworks";

const tauriWindow = getCurrentWindow();

export const Route = createFileRoute("/dialog/_l/erc20-add/$id")({
  component: ERC20AddDialog,
});

function ERC20AddDialog() {
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
      <div className="grid grid-cols-4 gap-5">
        <Datapoint
          label=""
          value={
            <div className="m-1 flex flex-col text-center">
              <IconAddress
                chainId={network.dedup_chain_id.chain_id}
                address={token.metadata.address}
              />
              <span className="self-center">{token.metadata.name}</span>
            </div>
          }
        />
        <Datapoint label="Symbol" value={token.metadata.symbol} />
        <Datapoint label="Decimals" value={token.metadata.decimals} />
        <Datapoint
          label="Address"
          value={
            <AddressView
              showLinkExplorer={false}
              address={token.metadata.address}
            />
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="destructive" onClick={() => tauriWindow.close()}>
          Cancel
        </Button>
        <Button type="submit" onClick={() => send("accept")}>
          Add
        </Button>
      </div>
    </div>
  );
}
