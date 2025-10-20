import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { type FieldValues, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";
import { Button } from "@ethui/ui/components/shadcn/button";

export const Route = createFileRoute("/home/_l/settings/_l/foundry")({
  beforeLoad: () => ({ breadcrumb: "Foundry" }),
  component: () => <SettingsFoundry />,
});

const schema = z.object({
  abiWatchPath: z.array(z.object({ path: z.string() })),
});

type Schema = z.infer<typeof schema>;

function SettingsFoundry() {
  const general = useSettings((s) => s.settings);

  console.log(general);
  const generalFormDefaults = general && {
    ...general,
    abiWatchPath: general?.abiWatchPath ? general.abiWatchPath.map((path) => ({ path })) : [],
  };

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: generalFormDefaults,
  });

  const abiWatchPaths = useFieldArray({ control: form.control, name: "abiWatchPath" });

  const onSubmit = useCallback(
    async (params: FieldValues) => {
      await invoke("settings_set", {
        params,
      });
    },
    [form],
  );

  const prepareAndSubmit = (data: Schema) => {
    onSubmit({
      ...data,
      abiWatchPath: data.abiWatchPath.map(({ path }) => path),
    })
    form.reset(data);
  }

  if (!general) return null;

  return (
    <Form form={form} onSubmit={prepareAndSubmit} className="flex flex-col gap-4">
      <span>
        ethui can monitor your filesystem for foundry projects, indexing the
        output ABIs automatically.
      </span>

      <div className="flex flex-col w-full pb-4">
        {abiWatchPaths.fields.length == 0 && <>foo</>}
        {abiWatchPaths.fields.map((field, i) => (
          <div className="flex items-center self-stretch" key={field.id}>
            <Form.Text
              label="ABI watch path"
              name={`abiWatchPath.${i}.path`}
              className="w-full"
            />
            <Button variant="ghost" onClick={() => abiWatchPaths.remove(i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button className="self-start" color="secondary" onClick={(e) => { e.preventDefault(); abiWatchPaths.append({ path: "" }) }}>
          Add ABI watch path
        </Button>
      </div>

      <Form.Submit label="Save" />
    </Form>
  );
}
