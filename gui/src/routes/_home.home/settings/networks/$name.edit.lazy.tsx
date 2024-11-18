import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { type Network, networkSchema } from "@ethui/types/network";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { AppNavbar } from "#/components/AppNavbar";
import { invoke } from "@tauri-apps/api/core";

export const Route = createLazyFileRoute("/_home/home/settings/networks/$name/edit")(
  {
    component: () => {
      const network = Route.useLoaderData();

      // TODO: can we show an error here instead?
      if (!network) return;

      return (
        <>
          <AppNavbar title={`Settings » Networks » ${network.name}`} />
          <div className="m-4">
            <Content network={network} />
          </div>
        </>
      );
    },
  },
);

function Content({ network }: { network: Network }) {
  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: network,
  });
  const router = useRouter();

  const onSubmit = async (data: Network) => {
    await invoke("networks_update", { oldName: network.name, network: data });
    router.history.back();
  };

  // TODO: fix remove button
  return (
    <Form form={form} onSubmit={onSubmit} className="gap-4">
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
        <Button>Save</Button>
        <Button variant="destructive">Remove</Button>
      </div>
    </Form>
  );
}
