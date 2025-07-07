import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
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

  if (!general) return null;

  return (
    <Form form={form} onSubmit={onSubmit}>
      <div className="w-100">
        <Form.Checkbox
          name="runLocalStacks"
          label="Enable Stacks Integration"
        />
      </div>

      <Form.Submit label="Save" />
    </Form>
  );
}
