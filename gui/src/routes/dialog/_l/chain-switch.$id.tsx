import { createFileRoute } from "@tanstack/react-router";
import { isDirty, isValid } from "zod";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import type { NetworkSwitch } from "@ethui/types";
import { Button } from "@ethui/ui/components/shadcn/button";
import { ChainView } from "@ethui/ui/components/chain-view";
import { useDialog } from "#/hooks/useDialog";
import { DialogBottom } from "#/components/Dialogs/Bottom";

export const Route = createFileRoute("/dialog/_l/chain-switch/$id")({
  component: ChainSwitchDialog,
});

export function ChainSwitchDialog() {
  const { id } = Route.useParams();
  const { data: network, send } = useDialog<NetworkSwitch>(id);

  if (!network) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full items-stretch justify-center self-center">
        <h1 className="font-xl">Switch network</h1>
      </div>

      <ChainView chainId={network.current_id} name={network.current_name} />
      <span>↓</span>
      <ChainView chainId={network.new_id} name={network.new_name} />

      <DialogBottom>
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
      </DialogBottom>
    </div>
  );
}
