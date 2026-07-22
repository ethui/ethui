import type { AnvilSnapshotsState, Network } from "@ethui/types/network";
import { type NetworkInputs, networkSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/networks/_l/$name/edit")({
  loader: ({ params }: { params: { name: string } }) =>
    useNetworks.getState().networks.find((n) => n.name === params.name),
  component: () => {
    const network = Route.useLoaderData();

    // TODO: can we show an error here instead?
    if (!network) return;

    return <Content network={network} />;
  },
});

function Content({ network }: { network: Network }) {
  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: network,
  });
  const router = useRouter();

  const create = async (data: NetworkInputs) => {
    try {
      await invoke("networks_update", { oldName: network.name, network: data });
      router.history.back();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.toString(),
        variant: "destructive",
      });
    }
  };

  const remove = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await invoke("networks_remove", { name: network.name });
    router.history.back();
  };

  const isAnvil = network.id.chain_id === 31337;
  const [anvilState, setAnvilState] = useState<AnvilSnapshotsState>({
    snapshots: network.anvil_snapshots ?? [],
    current: network.current_snapshot ?? null,
  });

  const snapshot = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const updated = await invoke<AnvilSnapshotsState>(
        "networks_anvil_snapshot",
        { id: network.id },
      );
      setAnvilState(updated);
      toast({ title: "Snapshot taken" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.toString(),
        variant: "destructive",
      });
    }
  };

  const revert =
    (snapshotId: string) => async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        const updated = await invoke<AnvilSnapshotsState>(
          "networks_anvil_revert",
          { id: network.id, snapshotId },
        );
        setAnvilState(updated);
        toast({ title: "Reverted to snapshot" });
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.toString(),
          variant: "destructive",
        });
      }
    };

  const deleteSnapshot =
    (snapshotId: string) => async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        const updated = await invoke<AnvilSnapshotsState>(
          "networks_anvil_delete_snapshot",
          { id: network.id, snapshotId },
        );
        setAnvilState(updated);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.toString(),
          variant: "destructive",
        });
      }
    };

  const reset = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const updated = await invoke<AnvilSnapshotsState>(
        "networks_anvil_reset",
        {
          id: network.id,
        },
      );
      setAnvilState(updated);
      toast({ title: "Anvil reset" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.toString(),
        variant: "destructive",
      });
    }
  };

  // TODO: fix remove button
  return (
    <Form form={form} onSubmit={create} className="gap-4">
      <div className="flex flex-row gap-2">
        <Form.Text label="Name" name="name" />
        <Form.NumberField
          className="[&::-webkit-inner-spin-button]:appearance-none"
          disabled={true}
          label="Chain Id"
          name="id.chain_id"
        />
      </div>

      <Form.Text
        label="HTTP RPC"
        name="http_url"
        className="w-full"
        nullIfEmpty
      />
      <Form.Text
        label="WebSockets RPC"
        name="ws_url"
        className="w-full"
        nullIfEmpty
      />
      <Form.Text
        label="Explorer URL"
        name="explorer_url"
        className="w-full"
        nullIfEmpty
      />
      <div className="flex flex-row gap-2">
        <Form.Text label="Currency" name="currency" />
        <Form.NumberField label="Decimals" name="decimals" />
      </div>

      {isAnvil && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={snapshot}>
              Take snapshot
            </Button>
            <Button variant="outline" onClick={reset}>
              Reset anvil
            </Button>
          </div>

          {anvilState.snapshots.length > 0 && (
            <ul className="flex flex-col gap-1">
              {anvilState.snapshots.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="text-sm">
                    #{s.id} — {new Date(s.taken_at).toLocaleString()}
                    {anvilState.current === s.id && " (current)"}
                  </span>
                  <Button variant="outline" size="sm" onClick={revert(s.id)}>
                    Revert
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteSnapshot(s.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="destructive" onClick={remove}>
          Remove
        </Button>
        <Form.Submit label="Save" />
      </div>
    </Form>
  );
}
