import { Button, Stack, Typography } from "@mui/material";
import { Delete, Task } from "@mui/icons-material";

import { useDialog } from "@/hooks";
import { DialogLayout } from "./Layout";

export function MsgSignDialog() {
  const { data, send } = useDialog<Record<string, string>>();

  if (!data) return null;

  const msg = data["Raw"] || JSON.stringify(data["Typed"], null, 2);

  return (
    <>
      <Typography variant="h6" component="h1">
        Sign Message
      </Typography>
      <Typography>{msg}</Typography>

      <DialogLayout.Bottom>
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
      </DialogLayout.Bottom>
    </>
  );
}
