import { type NetworkInputs, networkSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useForm } from "react-hook-form";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute(
  "/home/_l/settings/_l/networks/_l/$name/edit",
)({
  loader: ({ params }: { params: { name: string } }) =>
    useNetworks.getState().networks.find((n) => n.name === params.name),
  component: () => {
    const network = Route.useLoaderData();

    // TODO: can we show an error here instead?
    if (!network) return;

    return <Content network={network} />;
  },
});

function Content({ network }: { network: NetworkInputs }) {
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

  // TODO: fix remove button
  return (
    <Form form={form} onSubmit={create} className="gap-4">
      <div className="flex flex-row gap-2">
        <Form.Text label="Name" name="name" />
        <Form.NumberField
          className="[&::-webkit-inner-spin-button]:appearance-none"
          disabled={true}
          label="Chain Id"
          name="dedup_chain_id.chain_id"
        />
      </div>

      <Form.Text label="HTTP RPC" name="http_url" className="w-full" nullIfEmpty />
      <Form.Text label="WebSockets RPC" name="ws_url" className="w-full" nullIfEmpty />
      <Form.Text label="Explorer URL" name="explorer_url" className="w-full" nullIfEmpty />
      <div className="flex flex-row gap-2">
        <Form.Text label="Currency" name="currency" />
        <Form.NumberField label="Decimals" name="decimals" />
      </div>

      <div className="flex gap-2">
        <Button variant="destructive" onClick={remove}>
          Remove
        </Button>
        <Form.Submit label="Save" />
      </div>
    </Form>
  );
}
