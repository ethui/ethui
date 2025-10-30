import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/settings/_l/foundry")({
  beforeLoad: () => ({ breadcrumb: "Foundry" }),
  component: () => <SettingsFoundry />,
});

const schema = z.object({
  abiWatchPath: z.array(z.string()),
});

type Schema = z.infer<typeof schema>;

function SettingsFoundry() {
  const general = useSettings((s) => s.settings);

  console.log(general);

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: general,
  });

  const onSubmit = useCallback(async (params: FieldValues) => {
    await invoke("settings_set", {
      params,
    });
  }, []);

  const prepareAndSubmit = (data: Schema) => {
    onSubmit(data);
    form.reset(data);
  };

  if (!general) return null;

  return (
    <Form
      form={form}
      onSubmit={prepareAndSubmit}
      className="flex flex-col gap-4"
    >
      <span>
        ethui can monitor your filesystem for foundry projects, indexing the
        output ABIs automatically. Add your watch paths below:
      </span>

      <div className="flex w-full flex-col pb-4">
        <Form.MultiTagInput name="abiWatchPath" placeholder="Add a path" />
      </div>

      <Form.Submit label="Save" />
    </Form>
  );
}
