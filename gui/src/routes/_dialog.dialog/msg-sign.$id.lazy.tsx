import { Button, Stack, Typography } from "@mui/material";
import { Delete, Task } from "@mui/icons-material";
import { createLazyFileRoute } from "@tanstack/react-router";

import { useDialog } from "@/hooks";
import { DialogBottom } from "@/components/Dialogs/Bottom";

export const Route = createLazyFileRoute("/_dialog/dialog/msg-sign/$id")({
  component: MsgSignDialog,
});

export function MsgSignDialog() {
  const { id } = Route.useParams();
  const { data, send } = useDialog<Record<string, string>>(id);

  if (!data) return null;

  const msg = data["Raw"] || JSON.stringify(data["Typed"], null, 2);

  return (
    <>
      <Typography variant="h6" component="h1">
        Sign Message
      </Typography>
      <Typography>{msg}</Typography>

      <DialogBottom>
        <Stack direction="row" justifyContent="center" spacing={2}>
          <Button
            size="large"
            variant="contained"
            color="error"
            onClick={() => send("reject")}
            startIcon={<Delete />}
          >
            Reject
          </Button>
          <Button
            size="large"
            variant="contained"
            type="submit"
            onClick={() => send("accept")}
            endIcon={<Task />}
          >
            Sign
          </Button>
        </Stack>
      </DialogBottom>
    </>
  );
}
