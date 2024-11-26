import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { type FieldValues, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Link } from "@tanstack/react-router";

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

export const Route = createFileRoute("/onboarding/_l/alchemy")({
  component: OnboardingAlchemy,
});

function OnboardingAlchemy() {
  const router = useRouter();
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
      router.navigate({ to: "/onboarding/wallets" });
    },
    [router],
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
      <Form.Text label="API Key" name="alchemyApiKey" className="w-full" />

      <div className="flex w-full justify-center gap-2">
        <Button variant="ghost" onClick={() => router.history.back()}>
          Back
        </Button>

        <Form.Submit
          useDirtyAlt={false}
          label={alchemyApiKey?.length > 0 ? "Next" : "Skip"}
        />
      </div>
    </Form>
  );
}
