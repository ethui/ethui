import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import memoize from "lodash-es/memoize";
import { useCallback } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";
import { AutoSubmitTextInput } from "@ethui/ui/components/form/auto-submit-text-input";

export const Route = createFileRoute("/home/_l/settings/_l/general")({
  beforeLoad: () => ({ breadcrumb: "General" }),
  component: () => <SettingsGeneral />,
});

const schema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  autostart: z.boolean(),
  startMinimized: z.boolean(),
  alchemyApiKey: z.string().optional().nullable(),
  etherscanApiKey: z.string().optional().nullable(),

  hideEmptyTokens: z.boolean(),
  fastMode: z.boolean(),
  rustLog: z.string().optional(),
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
      <div>
        <Form.Select
          name="darkMode"
          label="Dark mode"
          defaultValue={general.darkMode}
          items={["auto", "dark", "light"]}
        />
      </div>

      <div className="w-80">
        <Form.Checkbox name="autostart" label="Start automatically on boot" />
      </div>

      <div className="w-80">
        <Form.Checkbox name="startMinimized" label="Start minimized" />
      </div>

      <AutoSubmitTextInput
        name="alchemyApiKey"
        label="Alchemy API Key"
        successLabel="Saved"
        value={general.alchemyApiKey || ""}
        callback={async (alchemyApiKey) =>
          await invoke("settings_set", { params: { alchemyApiKey } })
        }
      />

      <AutoSubmitTextInput
        name="etherscanApiKey"
        label="Etherscan API Key"
        successLabel="Saved"
        value={general.etherscanApiKey || ""}
        callback={async (etherscanApiKey) =>
          await invoke("settings_set", { params: { etherscanApiKey } })
        }
      />

      <div className="w-80">
        <Form.Checkbox
          label="Hide Tokens Without Balance"
          name="hideEmptyTokens"
        />
      </div>

      <AutoSubmitTextInput
        name="rustLog"
        label="Rust log level (tracing_subscriber)"
        successLabel="Saved"
        value={general.rustLog}
        callback={async (rustLog) =>
          await invoke("settings_set", { params: { rustLog } })
        }
      />

      <Form.Submit label="Save" />
    </Form>
  );
}
