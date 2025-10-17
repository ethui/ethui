import { ClickToCopy } from "@ethui/ui/components/click-to-copy";
import { Button } from "@ethui/ui/components/shadcn/button";
import { cn } from "@ethui/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Copy } from "lucide-react";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/networks/_l/stacks/_l/$name")({
  beforeLoad: ({ params }) => ({
    breadcrumb: { label: params.name, path: null },
  }),
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

  if (!stackNetwork) return null;

  const remove = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await invoke("stacks_remove", { slug: name });
    window.history.back();
  };

  return (
    <div className="flex w-fit flex-col gap-4">
      <LabelValue label="Name" value={name} />

      <ClickToCopy
        className="flex flex-row gap-2"
        text={String(stackNetwork.id.chain_id)}
      >
        <LabelValue
          className="hover:bg-accent"
          label="Chain Id"
          value={String(stackNetwork.id.chain_id)}
          icon={<Copy size={12} className="stroke-current/50" />}
        />
      </ClickToCopy>

      <ClickToCopy text={String(stackNetwork.http_url)}>
        <LabelValue
          className="hover:bg-accent"
          label="HTTP RPC"
          value={String(stackNetwork.http_url)}
          icon={<Copy size={12} className="stroke-current/50" />}
          mono
        />
      </ClickToCopy>

      <ClickToCopy text={stackNetwork.explorer_url ?? ""}>
        <LabelValue
          className="hover:bg-accent"
          label="Explorer URL"
          value={stackNetwork.explorer_url || ""}
          icon={<Copy size={12} className="stroke-current/50" />}
          mono
        />
      </ClickToCopy>

      <div className="flex flex-row gap-2">
        <LabelValue label="Currency" value={stackNetwork.currency} />
        <LabelValue label="Decimals" value={String(stackNetwork.decimals)} />
      </div>

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
  icon,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col p-1", className)}>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div
        className={cn(
          "flex flex-row items-center gap-2",
          mono && "break-all font-mono",
        )}
      >
        {value || "-"} {icon}
      </div>
    </div>
  );
}
