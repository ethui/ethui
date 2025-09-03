import { stacksSchema } from "@ethui/types/network";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/home/_l/stacks/_l/$name/edit")({
  loader: ({ params }: { params: { name: string } }) => params.name,
  component: () => {
    const name = Route.useLoaderData();

    // TODO: can we show an error here instead?
    if (!name) return;

    return <Content name={name} />;
  },
});

function Content({ name }: { name: string }) {
  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(stacksSchema),
  });
  const router = useRouter();

  console.log(name);

  const remove = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await invoke("stacks_remove", { slug: name });
    router.history.back();
  };

  const onSubmit = async (_params: object) => {
    router.history.back();
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="gap-4">
      <div className="flex flex-row gap-2">
        <p> {name}</p>
      </div>

      <div className="flex gap-2">
        <Button variant="destructive" onClick={remove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
