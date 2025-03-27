import { createFileRoute } from "@tanstack/react-router";

import { HighlightBox } from "@ethui/ui/components/highlight-box";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";

import { Button } from "@ethui/ui/components/shadcn/button";
import { type Hex, hexToString } from "viem";
import { Json } from "#/components/JsonView";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/dialog/_l/msg-sign/$id")({
  component: MsgSignDialog,
});

function MsgSignDialog() {
  const { id } = Route.useParams();
  const { data, send } = useDialog<
    { raw: Hex } | { typed: Hex } | { Plume: Hex }
  >(id);

  if (!data) return null;

  let msg: string;
  let json: object | undefined;

  if ("raw" in data) {
    msg = hexToString(data.raw);
  } else if ("Plume" in data) {
    msg = data.Plume;
  } else {
    try {
      msg = JSON.stringify(data.typed, null, 2);
    } catch (_e) {
      msg = data.typed;
    }
  }

  try {
    json = JSON.parse(msg);
  } catch (_e) { }

  return (
    <div className="flex h-full flex-col justify-between gap-3 ">
      <h1 className="font-xl">Sign Message</h1>
      <ScrollArea className="flex-grow">
        <HighlightBox className="whitespace-pre-wrap text-sm">
          {json && <Json src={json} />}
          {!json && msg}
        </HighlightBox>
      </ScrollArea>
      <div className="flex w-full items-center justify-center gap-2">
        <Button
          disabled={!msg}
          variant="destructive"
          color="error"
          onClick={() => send("reject")}
        >
          Reject
        </Button>
        <Button disabled={!msg} type="submit" onClick={() => send("accept")}>
          Sign
        </Button>
      </div>
    </div>
  );
}
