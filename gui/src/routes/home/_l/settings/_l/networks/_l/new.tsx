import { type NetworkInputs, networkSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/home/_l/settings/_l/networks/_l/new")({
  beforeLoad: () => ({ breadcrumb: "New" }),
  component: () => {
    return <Content />;
  },
});

function Content() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: {
      id: { dedup_id: 0 },
    },
  });

  const httpUrl = form.watch("http_url");
  const userChainId = form.watch("id.chain_id");

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
          form.setValue("id.chain_id", chainId);
          form.clearErrors("id.chain_id");
        }
      } catch (_e) {
        return null;
      }
    };

    fetchChainId();
  }, [httpUrl, userChainId, form.setValue, form.clearErrors]);

  const onSubmit = async (data: NetworkInputs) => {
    try {
      setLoading(true);
      await invoke("networks_add", { network: data });
      setLoading(false);
      router.history.back();
    } catch (err: any) {
      setLoading(false);
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
      <div className="flex flex-row gap-2">
        <Form.Text label="Name" name="name" />
        <Form.NumberField
          className="[&::-webkit-inner-spin-button]:appearance-none"
          label="Chain Id"
          name="dedup_chain_id.chain_id"
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

      <div className="flex gap-2">
        <Button variant="destructive" onClick={cancel}>
          Cancel
        </Button>
        <Button>
          {loading ? <LoaderCircle className="animate-spin" /> : <Check />}
          Create
        </Button>
      </div>
    </Form>
  );
}
