import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { useInvoke } from "#/hooks/useInvoke";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";
import { ChainView } from "@ethui/ui/components/chain-view";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/home/_l/stacks/_l/")({
  beforeLoad: () => ({ breadcrumb: "Stacks" }),
  component: RouteComponent,
});

const schema = z.object({
  runLocalStacks: z.boolean(),
});

function RouteComponent() {
  const general = useSettings((s) => s.settings!);

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: general,
  });

  const onSubmit = useCallback(
    async (params: FieldValues) => {
      await invoke("settings_set", {
        params,
      });
      form.reset(params);
    },
    [form],
  );

  const [slug, setSlug] = useState("");
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: stacks, refetch } = useInvoke<string[]>("stacks_list");

  const handleCreateStack = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateStatus(null);
    try {
      await invoke("stacks_create", { slug });
      setCreateStatus("Stack created successfully.");
      setSlug("");
      refetch();
    } catch (err: any) {
      setCreateStatus(err?.toString() || "Failed to create stack");
    } finally {
      setCreating(false);
    }
  };

  if (!general) return null;

  //return (
  //  <>
  //    <Form form={form} onSubmit={onSubmit}>
  //      <div className="w-100">
  //        <Form.Checkbox
  //          name="runLocalStacks"
  //          label="Enable Stacks Integration"
  //        />
  //      </div>
  //      <Form.Submit label="Save" />
  //    </Form>

  //    <hr className="my-6" />

  //    <form onSubmit={handleCreateStack} className="space-y-4">
  //      <div>
  //        <p className="block mb-1 font-medium">New Stack Slug</p>
  //        <input
  //          type="text"
  //          value={slug}
  //          onChange={(e) => setSlug(e.target.value)}
  //          className="input input-bordered w-full"
  //          placeholder="e.g. foo"
  //          required
  //        />
  //      </div>
  //      <button
  //        type="submit"
  //        className="btn btn-primary"
  //        disabled={creating || !slug}
  //      >
  //        {creating ? "Creating..." : "Create Stack"}
  //      </button>
  //      {createStatus && (
  //        <div className="mt-2 text-sm text-center text-info">
  //          {createStatus}
  //        </div>
  //      )}
  //    </form>

  //    {stacks?.map((stack) => (
  //      <div className="flex flex-wrap gap-2" key={stack}>
  //        <p>{stack}</p>
  //      </div>
  //    ))}
  //  </>
  //);

  ///////////////////////////////////////////////////

  if (!stacks) return "Loading";

  // TODO: add network button
  return (
    <div className="flex flex-wrap gap-2">
      {stacks.map((name) => (
        <Link
          to={`/home/stacks/${name}/edit`}
          key={name}
          className="border p-4 hover:bg-accent"
        >
          <ChainView chainId={1} name={name} status={"online"} />
        </Link>
      ))}
      <Link
        to="/home/stacks/new"
        className="flex gap-2 border p-4 align-baseline hover:bg-accent"
      >
        <Plus />
        Add new
      </Link>
    </div>
  );
}
