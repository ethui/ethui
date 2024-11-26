import { type Network, networkSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
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

function Content({ network }: { network: Network }) {
  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: network,
  });
  const router = useRouter();

  const create = async (data: Network) => {
    await invoke("networks_update", { oldName: network.name, network: data });
    router.history.back();
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
        <Form.NumberField label="Chain Id" name="chain_id" />

        <Form.Checkbox label="Anvil" name="force_is_anvil" />
      </div>

      <Form.Text label="HTTP RPC" name="http_url" className="w-full" />
      <Form.Text label="WebSockets RPC" name="ws_url" className="w-full" />
      <Form.Text label="Explorer URL" name="explorer_url" className="w-full" />
      <div className="flex flex-row gap-2">
        <Form.Text label="Currency" name="currency" />
        <Form.NumberField label="Decimals" name="decimals" />
      </div>

      <div className="flex gap-2">
        <Form.Submit label="Save" />
        <Button variant="destructive" onClick={remove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
