import { createFileRoute } from "@tanstack/react-router";
import { Stack, Typography, Button } from "@mui/material";
import { isDirty, isValid } from "zod";
import { window as tauriWindow } from "@tauri-apps/api";

import { NetworkSwitch } from "@ethui/types";
import { ChainView } from "@ethui/react/components";
import { useDialog } from "@/hooks";

export const Route = createFileRoute("/_dialog/dialog/chain-switch/$id")({
  component: ChainSwitchDialog,
});

export function ChainSwitchDialog() {
  const { id } = Route.useParams();
  const { data: network, send } = useDialog<NetworkSwitch>(id);

  if (!network) return null;

  return (
    <Stack spacing={2} alignItems="center">
      <Typography variant="h6" component="h1">
        Switch the network?
      </Typography>

      <Typography textAlign={"center"}>
        This will switch the selected network within Ethui to a previously added
        network:
      </Typography>
      <ChainView chainId={network.current_id} name={network.current_name} />
      <span>↓</span>
      <ChainView chainId={network.new_id} name={network.new_name} />

      <Stack direction="row" spacing={2} paddingTop={2}>
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
          Switch
        </Button>
      </Stack>
    </Stack>
  );
}
