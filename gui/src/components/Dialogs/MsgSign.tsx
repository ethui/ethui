import { Button, Stack, Typography } from "@mui/material";

import { useDialog } from "@/hooks";
import { DialogLayout } from "./Layout";

export function MsgSignDialog({ id }: { id: number }) {
  const { data, send } = useDialog<Record<string, string>>(id);

  if (!data) return null;

  const msg = data["Raw"] || JSON.stringify(data["Typed"], null, 2);

  return (
    <DialogLayout>
      <Typography variant="h6" component="h1">
        Sign Message
      </Typography>
      <Typography>{msg}</Typography>

      <Stack direction="row" justifyContent="center" spacing={2}>
        <Button
          variant="contained"
          color="error"
          onClick={() => send("reject")}
        >
          Reject
        </Button>
        <Button
          variant="contained"
          type="submit"
          onClick={() => send("accept")}
        >
          Sign
        </Button>
      </Stack>
    </DialogLayout>
  );
}
