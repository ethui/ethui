import { type StacksInputs, stacksSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { toast } from "@ethui/ui/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useInvoke } from "#/hooks/useInvoke";

export const Route = createFileRoute("/home/_l/networks/_l/stacks/_l/new")({
  beforeLoad: () => ({ breadcrumb: "New" }),
  component: () => {
    return <Content />;
  },
});

function Content() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<StacksInputs>({
    mode: "onBlur",
    resolver: zodResolver(stacksSchema),
  });

  const slug = form.watch("slug");

  const { data: stacks } = useInvoke<string[]>("stacks_list");

  const onSubmit = async (_data: { slug: string }) => {
    console.log(stacks);
    try {
      setLoading(true);
      await invoke("stacks_create", { slug });
      toast({
        title: "Stack created",
        description: "It may take a few seconds to start the stack",
        variant: "success",
      });
      setLoading(false);
      router.history.back();
    } catch (err: any) {
      console.log(err);
      setLoading(false);
      toast({
        title: "Error",
        description: err.toString(),
        variant: "destructive",
      });
    }
  };

  const cancel = () => router.history.back();

  return (
    <Form form={form} onSubmit={onSubmit} className="gap-4">
      <div className="flex flex-row gap-2">
        <Form.Text label="Slug" name="slug" />
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
