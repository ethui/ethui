import { Button, Stack, Typography } from "@mui/material";

import { useDialog } from "../hooks";

export function MsgSignDialog({ id }: { id: number }) {
  const { data, accept, reject } = useDialog<Record<string, string>>(id);

  if (!data) return null;

  const msg = data["Raw"] || JSON.stringify(data["Typed"], null, 2);

  return (
    <Stack direction="column" spacing={2} sx={{ p: 2 }}>
      <Typography variant="h6" component="h1">
        Sign Message
      </Typography>
      <Typography>{msg}</Typography>

      <Stack direction="row" justifyContent="center" spacing={2}>
        <Button variant="contained" color="error" onClick={() => reject()}>
          Reject
        </Button>
        <Button variant="contained" type="submit" onClick={() => accept(data)}>
          Sign
        </Button>
      </Stack>
    </Stack>
  );
}
