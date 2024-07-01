import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useCallback } from "react";
import { type FieldValues, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { StepProps } from ".";

import { Form } from "@ethui/react/components";

export function AlchemyStep({ onSubmit }: StepProps) {
  const schema = z.object({
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
  });

  const form = useForm({ mode: "onChange", resolver: zodResolver(schema) });

  const alchemyApiKey = useWatch({
    control: form.control,
    name: "alchemyApiKey",
  });

  const localOnSubmit = useCallback(
    (params: FieldValues) => {
      invoke("settings_set", {
        params: { alchemyApiKey: params.alchemyApiKey },
      });
      onSubmit();
    },
    [onSubmit],
  );

  return (
    <Form form={form} onSubmit={localOnSubmit}>
      <Stack alignItems="flex-end" spacing={3}>
        <Typography variant="h6" component="h1" alignSelf="start">
          Alchemy
        </Typography>

        <Typography component="p">
          ethui works with{" "}
          <Link
            underline="hover"
            href="https://book.getfoundry.sh/anvil/"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            Anvil
          </Link>{" "}
          out of the box. But for live blockchains, a connection to{" "}
          <Link
            underline="hover"
            href="https://www.alchemy.com/"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            alchemy.com
          </Link>{" "}
          is recommended. Go to your{" "}
          <Link
            underline="hover"
            href="https://dashboard.alchemy.com/apps"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            Alchemy dashboard
          </Link>{" "}
          and grab an API key.
        </Typography>
        <Form.Text label="API Key" name="alchemyApiKey" fullWidth />

        <Form.Submit
          useDirtyAlt={false}
          label={alchemyApiKey?.length > 0 ? "Next" : "Skip"}
        />
      </Stack>
    </Form>
  );
}
