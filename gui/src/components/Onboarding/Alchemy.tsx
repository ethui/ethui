import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { type FieldValues, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Form } from "@ethui/ui/components/form";
import { Link } from "@tanstack/react-router";
import type { StepProps } from ".";

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
      <h1 className="self-start text-xl">Alchemy</h1>

      <p>
        ethui works with{" "}
        <Link
          href="https://book.getfoundry.sh/anvil/"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          Anvil
        </Link>{" "}
        out of the box. But for live blockchains, a connection to{" "}
        <Link
          href="https://www.alchemy.com/"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          alchemy.com
        </Link>{" "}
        is recommended. Go to your{" "}
        <Link
          href="https://dashboard.alchemy.com/apps"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          Alchemy dashboard
        </Link>{" "}
        and grab an API key.
      </p>
      <Form.Text label="API Key" name="alchemyApiKey" />

      <Form.Submit
        useDirtyAlt={false}
        label={alchemyApiKey?.length > 0 ? "Next" : "Skip"}
      />
    </Form>
  );
}
