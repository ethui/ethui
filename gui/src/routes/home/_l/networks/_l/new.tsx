import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

export const schema = z.object({
  name: z.string().min(1, "Invalid name"),
  explorer_url: z.url().optional().nullable(),
  http_url: z.url().min(1),
  ws_url: z.url().nullable().optional(),
  currency: z.string().min(1, "Invalid currency"),
  decimals: z.number("Invalid number"),
  chain_id: z.number().positive(),
});

export type Schema = z.infer<typeof schema>;

export const Route = createFileRoute("/home/_l/networks/_l/new")({
  beforeLoad: () => ({ breadcrumb: "New" }),
  component: () => {
    return <Content />;
  },
});

function Content() {
  const router = useRouter();

  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
  });

  const httpUrl = form.watch("http_url");
  const userChainId = form.watch("chain_id");

  useEffect(() => {
    if (!httpUrl) return;

    const fetchChainId = async () => {
      try {
        const chainId = await invoke<number>(
          "networks_chain_id_from_provider",
          {
            url: httpUrl,
          },
        );

        if (!userChainId) {
          form.setValue("chain_id", chainId);

          form.clearErrors("chain_id");
        }
      } catch (_e) {
        return null;
      }
    };

    fetchChainId();
  }, [httpUrl, userChainId, form.setValue, form.clearErrors]);

  const onSubmit = async (data: Schema) => {
    try {
      await invoke("networks_add", { network: { ...data, is_stack: false } });
      router.history.back();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.toString(),
        variant: "destructive",
      });
    }
  };

  const cancel = () => router.history.back();

  // TODO: fix remove button
  return (
    <Form form={form} onSubmit={onSubmit} className="gap-4">
      <Form.Text label="Name" name="name" />

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
        <Form.NumberField
          className="[&::-webkit-inner-spin-button]:appearance-none"
          label="Chain Id"
          name="chain_id"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="destructive" onClick={cancel}>
          Cancel
        </Button>
        <Form.Submit label="save" />
      </div>
    </Form>
  );
}
