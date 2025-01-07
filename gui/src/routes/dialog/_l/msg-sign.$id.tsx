import { createFileRoute } from "@tanstack/react-router";

import { HighlightBox } from "@ethui/ui/components/highlight-box";

import { Button } from "@ethui/ui/components/shadcn/button";
import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/dialog/_l/msg-sign/$id")({
  component: MsgSignDialog,
});

function MsgSignDialog() {
  const { id } = Route.useParams();
  const { data, send } = useDialog<Record<string, string>>(id);
  const [loading, setLoading] = useState(false);

  if (!data) return null;

  const msg = data.Raw || JSON.stringify(data.Typed, null, 2);

  const onClick = () => {
    setLoading(true);
    send("accept");
    setLoading(false);
  };

  return (
    <div className="h-full flex-col gap-3.5">
      <h1 className="font-xl">Sign Message</h1>
      {msg && (
        <HighlightBox className="w-full">
          <span className="whitespace-pre-wrap font-mono">{msg}</span>
        </HighlightBox>
      )}
      <div className="flex w-full items-center justify-center gap-2">
        <Button
          disabled={!msg}
          variant="destructive"
          color="error"
          onClick={() => send("reject")}
        >
          Reject
        </Button>
        <Button disabled={!msg} type="submit" onClick={onClick}>
          {loading ? <LoaderCircle className="animate-spin" /> : <Check />}
          Sign
        </Button>
      </div>
    </div>
  );
}
