import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/dialog/_l/wc-session-proposal/$id")({
  component: WcSessionProposalDialog,
});

interface SessionProposal {
  name: string;
  url: string;
  icons: string[];
  chains: string[] | null;
  methods: string[] | null;
}

function WcSessionProposalDialog() {
  const { id } = Route.useParams();
  const { data: proposal, send } = useDialog<SessionProposal>(id);

  if (!proposal) return null;

  const icon = proposal.icons[0];

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex flex-col items-center gap-2">
        {icon && (
          <img
            src={icon}
            alt={proposal.name}
            className="h-14 w-14 rounded-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <h1 className="font-semibold text-lg">{proposal.name}</h1>
        <p className="text-muted-foreground text-sm">{proposal.url}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">Requested chains</p>
        <div className="flex flex-wrap gap-1">
          {(proposal.chains ?? []).map((c) => (
            <span
              key={c}
              className="rounded bg-muted px-2 py-0.5 font-mono text-xs"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">Requested methods</p>
        <div className="flex flex-wrap gap-1">
          {(proposal.methods ?? []).map((m) => (
            <span
              key={m}
              className="rounded bg-muted px-2 py-0.5 font-mono text-xs"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-center gap-3 pt-2">
        <Button
          variant="destructive"
          onClick={() => getCurrentWebviewWindow().close()}
        >
          Reject
        </Button>
        <Button type="submit" onClick={() => send({ approved: true })}>
          Connect
        </Button>
      </div>
    </div>
  );
}
