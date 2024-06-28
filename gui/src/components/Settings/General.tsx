import { zodResolver } from "@hookform/resolvers/zod";
import { Stack } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useCallback } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { Form } from "@ethui/react/components";
import { useSettings } from "@/store";

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
    <Form form={form} onSubmit={onSubmit} className="flex flex-col gap-4">
      <Stack alignItems="flex-start" spacing={2}>
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

        <Form.Checkbox name="fastMode" label="Fast mode" />

        <Form.Text name="alchemyApiKey" label="Alchemy API Key" fullWidth />
        <Form.Text label="Etherscan API Key" name="etherscanApiKey" fullWidth />

        <Form.Checkbox
          label="Hide Tokens Without Balance"
          name="hideEmptyTokens"
        />

        <Form.Submit label="Save" />
      </Stack>
    </Form>
  );
}
