import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { Form } from "@ethui/ui/components/form";
import { AppNavbar } from "#/components/AppNavbar";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/_home/home/settings/general")({
  component: () => (
    <>
      <AppNavbar title="Settings » General" />
      <div className="m-4">
        <SettingsGeneral />
      </div>
    </>
  ),
});

export const schema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  autostart: z.boolean(),
  alchemyApiKey: z
    .string()
    .optional()
    .nullable()
    .superRefine(async (key, ctx) => {
      if (!key) return;
      const valid = await invoke("settings_test_alchemy_api_key", { key });
      if (valid) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid key",
      });
    }),
  etherscanApiKey: z
    .string()
    .optional()
    .nullable()

    .superRefine(async (key, ctx) => {
      if (!key) return;
      const valid = await invoke("settings_test_etherscan_api_key", { key });
      if (valid) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid key",
      });
    }),
  hideEmptyTokens: z.boolean(),
  onboarded: z.boolean(),
  fastMode: z.boolean(),
});

export function SettingsGeneral() {
  const general = useSettings((s) => s.settings);

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

      <Form.Checkbox
        name="autostart"
        label="Start automatically on boot (minimized)"
      />

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

      <Form.Checkbox
        label="Hide Tokens Without Balance"
        name="hideEmptyTokens"
      />

      <Form.Submit label="Save" />
    </Form>
  );
}
