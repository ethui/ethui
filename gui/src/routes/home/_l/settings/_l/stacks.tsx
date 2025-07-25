import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/settings/_l/stacks")({
  beforeLoad: () => ({ breadcrumb: "Stacks" }),
  component: () => <SettingsStacks />,
});

const schema = z.object({
  runLocalStacks: z.boolean(),
});

function SettingsStacks() {
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

  const handleCreateStack = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateStatus(null);
    try {
      await invoke("stacks_create", { slug });
      setCreateStatus("Stack created successfully.");
      setSlug("");
    } catch (err: any) {
      setCreateStatus(err?.toString() || "Failed to create stack");
    } finally {
      setCreating(false);
    }
  };

  if (!general) return null;

  return (
    <>
      <Form form={form} onSubmit={onSubmit}>
        <div className="w-100">
          <Form.Checkbox
            name="runLocalStacks"
            label="Enable Stacks Integration"
          />
        </div>
        <Form.Submit label="Save" />
      </Form>

      <hr className="my-6" />

      <form onSubmit={handleCreateStack} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">New Stack Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="input input-bordered w-full"
            placeholder="e.g. foo"
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating || !slug}
        >
          {creating ? "Creating..." : "Create Stack"}
        </button>
        {createStatus && (
          <div className="mt-2 text-sm text-center text-info">
            {createStatus}
          </div>
        )}
      </form>
    </>
  );
}
