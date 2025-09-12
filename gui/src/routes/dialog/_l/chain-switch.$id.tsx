import { ChainView } from "@ethui/ui/components/chain-view";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useDialog } from "#/hooks/useDialog";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/dialog/_l/chain-switch/$id")({
  component: ChainSwitchDialog,
});

interface NetworkSwitch {
  oldId: number;
  newId: number;
}

function ChainSwitchDialog() {
  const { id } = Route.useParams();
  const { data: switchData, send } = useDialog<NetworkSwitch>(id);
  const networks = useNetworks((s) => s.networks);

  if (!switchData) return null;

  const from = networks.find(
    (n) => n.dedup_chain_id.chain_id === switchData.oldId,
  );
  const to = networks.find(
    (n) => n.dedup_chain_id.chain_id === switchData.newId,
  );

  if (!from || !to) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full items-stretch justify-center self-center">
        <h1 className="font-xl">Switch network</h1>
      </div>

      <div className="flex gap-2 self-center">
        <ChainView
          chainId={from.dedup_chain_id.chain_id}
          name={from.name}
          status={from.status}
        />
        <span>→</span>
        <ChainView
          chainId={to?.dedup_chain_id.chain_id}
          name={to.name}
          status={to.status}
        />
      </div>

      <div className="m-2 flex items-center justify-center gap-2">
        <Button
          variant="destructive"
          onClick={() => getCurrentWebviewWindow().close()}
        >
          Cancel
        </Button>
        <Button type="submit" onClick={() => send("accept")}>
          Switch
        </Button>
      </div>
    </div>
  );
}
