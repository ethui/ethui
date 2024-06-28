import { Button, Stack } from "@mui/material";
import { Delete, Task } from "@mui/icons-material";
import { createFileRoute } from "@tanstack/react-router";

import { HighlightBox, Typography } from "@ethui/react/components";
import { useDialog } from "@/hooks";

export const Route = createFileRoute("/_dialog/dialog/msg-sign/$id")({
  component: MsgSignDialog,
});

export function MsgSignDialog() {
  const { id } = Route.useParams();
  const { data, send } = useDialog<Record<string, string>>(id);

  if (!data) return null;

  const msg = data.Raw || JSON.stringify(data.Typed, null, 2);

  return (
    <Stack
      sx={{
        height: "100%",
        gap: "15px",
      }}
    >
      <Typography variant="h6" component="h1">
        Sign Message
      </Typography>
      {msg && (
        <HighlightBox
          fullWidth
          sx={{
            overflowY: "auto",
            minHeight: 100,
          }}
        >
          <Typography whiteSpace="pre-wrap" variant="body2" mono>
            {msg}
          </Typography>
        </HighlightBox>
      )}
      <Stack
        direction="row"
        justifyContent="center"
        spacing={2}
        marginTop="auto"
      >
        <Button
          disabled={!msg}
          size="large"
          variant="contained"
          color="error"
          onClick={() => send("reject")}
          startIcon={<Delete />}
        >
          Reject
        </Button>
        <Button
          disabled={!msg}
          size="large"
          variant="contained"
          type="submit"
          onClick={() => send("accept")}
          endIcon={<Task />}
        >
          Sign
        </Button>
      </Stack>
    </Stack>
  );
}
