import { type Network, networkSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/home/_l/settings/_l/networks/_l/new")({
  beforeLoad: () => ({ breadcrumb: "New" }),
  component: () => {
    return <Content />;
  },
});

function Content() {
  const form = useForm<Network>({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
  });
  const router = useRouter();

  const onSubmit = async (data: Network) => {
    await invoke("networks_add", { network: data });
    router.history.back();
  };

  const cancel = () => router.history.back();

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
        <Button>Create</Button>
        <Button variant="destructive" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}
