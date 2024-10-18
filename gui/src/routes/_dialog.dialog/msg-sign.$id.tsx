import { Delete, Task } from "@mui/icons-material";
import { Button } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

import { HighlightBox } from "@ethui/react/components/HighlightBox";
import { Typography } from "@ethui/react/components/Typography";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/_dialog/dialog/msg-sign/$id")({
  component: MsgSignDialog,
});

export function MsgSignDialog() {
  const { id } = Route.useParams();
  const { data, send } = useDialog<Record<string, string>>(id);

  if (!data) return null;

  const msg = data.Raw || JSON.stringify(data.Typed, null, 2);

  return (
    <div className="h-full flex-col gap-3.5">
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
      <div className=" center m-2 mt-auto flex justify-center">
        <Button
          disabled={!msg}
          size="large"
          color="error"
          onClick={() => send("reject")}
          startIcon={<Delete />}
        >
          Reject
        </Button>
        <Button
          disabled={!msg}
          size="large"
          type="submit"
          onClick={() => send("accept")}
          endIcon={<Task />}
        >
          Sign
        </Button>
      </div>
    </div>
  );
}
