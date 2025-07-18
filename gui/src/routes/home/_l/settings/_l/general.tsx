import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import memoize from "lodash-es/memoize";
import { useCallback } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/settings/_l/general")({
  beforeLoad: () => ({ breadcrumb: "General" }),
  component: () => <SettingsGeneral />,
});

const alchemyKeyValidator = memoize(
  (key) => !key || invoke("settings_test_alchemy_api_key", { key }),
);

const etherscanKeyValidator = memoize(
  (key) => !key || invoke("settings_test_etherscan_api_key", { key }),
);

const rustLogValidator = memoize(
  (directives) =>
    !directives || invoke("settings_test_rust_log", { directives }),
);

const schema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  autostart: z.boolean(),
  startMinimized: z.boolean(),
  alchemyApiKey: z.string().optional().nullable().refine(alchemyKeyValidator, {
    message: "Invalid key",
  }),
  etherscanApiKey: z
    .string()
    .optional()
    .nullable()

    .refine(etherscanKeyValidator, { message: "Invalid key" }),
  hideEmptyTokens: z.boolean(),
  fastMode: z.boolean(),
  rustLog: z.string().optional().refine(rustLogValidator, "Invalid directives"),
});

function SettingsGeneral() {
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
      <Form.Select
        name="darkMode"
        label="Dark mode"
        defaultValue={general.darkMode}
        items={["auto", "dark", "light"]}
      />

      <div className="w-100">
        <Form.Checkbox name="autostart" label="Start automatically on boot" />
      </div>

      <div className="w-100">
        <Form.Checkbox name="startMinimized" label="Start minimized" />
      </div>

      <Form.Text
        name="alchemyApiKey"
        label="Alchemy API Key"
        className="w-full"
      />
      <Form.Text
        label="Etherscan API Key"
        name="etherscanApiKey"
        className="w-full"
      />

      <div className="w-100">
        <Form.Checkbox
          label="Hide Tokens Without Balance"
          name="hideEmptyTokens"
        />
      </div>

      <Form.Text
        label="Rust log level (tracing_subscriber)"
        name="rustLog"
        className="w-full"
      />

      <Form.Submit label="Save" />
    </Form>
  );
}
