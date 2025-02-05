import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ethui/ui/components/shadcn/button";
import { isDirty, isValid } from "zod";

import { ChainView } from "@ethui/ui/components/chain-view";
import { useDialog } from "#/hooks/useDialog";
import { useNetworks } from "#/store/useNetworks";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export const Route = createFileRoute("/dialog/_l/chain-switch/$id")({
  component: ChainSwitchDialog,
});

interface NetworkSwitch {
  oldId: number;
  newId: number;
}

export function ChainSwitchDialog() {
  const { id } = Route.useParams();
  const { data: switchData, send } = useDialog<NetworkSwitch>(id);
  const networks = useNetworks((s) => s.networks);

  if (!switchData) return null;

  const from = networks.find((n) => n.chain_id === switchData.oldId);
  const to = networks.find((n) => n.chain_id === switchData.newId);

  if (!from || !to) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full items-stretch justify-center self-center">
        <h1 className="font-xl">Switch network</h1>
      </div>

      <div className="flex gap-2 self-center">
        <ChainView chainId={from.chain_id} name={from.name} />
        <span>→</span>
        <ChainView chainId={to?.chain_id} name={to.name} />
      </div>

      <div className="m-2 flex items-center justify-center gap-2">
        <Button
          variant="destructive"
          onClick={() => getCurrentWebviewWindow().close()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || !isValid}
          onClick={() => send("accept")}
        >
          Switch
        </Button>
      </div>
    </div>
  );
}
