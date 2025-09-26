import { ClickToCopy } from "@ethui/ui/components/click-to-copy";
import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/stacks/_l/$name")({
  loader: ({ params }: { params: { name: string } }) => params.name,
  component: () => {
    const name = Route.useLoaderData();
    if (!name) return null;
    return <Content name={name} />;
  },
});

function Content({ name }: { name: string }) {
  const networks = useNetworks((s) => s.networks);
  const stackNetwork = networks?.find((n) => n.name === name);

  const remove = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await invoke("stacks_remove", { slug: name });
    window.history.back();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-2">
        <LabelValue label="Name" value={name} />
      </div>

      {stackNetwork && (
        <>
          <div className="flex flex-row gap-2">
            <ClickToCopy
              className="hover:bg-accent"
              text={String(stackNetwork.id.chain_id)}
            >
              <LabelValue
                label="Chain Id"
                value={String(stackNetwork.id.chain_id)}
              />
            </ClickToCopy>
          </div>

          <ClickToCopy
            className="hover:bg-accent"
            text={String(stackNetwork.http_url)}
          >
            <LabelValue
              label="HTTP RPC"
              value={String(stackNetwork.http_url)}
              mono
            />
          </ClickToCopy>

          <ClickToCopy
            className="hover:bg-accent"
            text={String(stackNetwork.ws_url)}
          >
            <LabelValue
              label="WebSockets RPC"
              value={String(stackNetwork.ws_url)}
              mono
            />
          </ClickToCopy>

          <Link
            className="hover:bg-accent"
            target="_blank"
            to={stackNetwork.explorer_url}
          >
            <LabelValue
              label="Explorer URL"
              value={stackNetwork.explorer_url || ""}
              mono
            />
          </Link>

          <div className="flex flex-row gap-2">
            <LabelValue label="Currency" value={stackNetwork.currency} />
            <LabelValue
              label="Decimals"
              value={String(stackNetwork.decimals)}
            />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button variant="destructive" onClick={remove}>
          Remove
        </Button>
      </div>
    </div>
  );
}

function LabelValue({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-64 flex-col">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={mono ? "break-all font-mono" : ""}>{value || "-"}</div>
    </div>
  );
}
