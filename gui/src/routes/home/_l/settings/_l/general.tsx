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
import { Select as SelectContent, Select, SelectTrigger, SelectValue } from "@ethui/ui/components/shadcn/select";

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
        <FormLabel className="shrink-0">Dark mode</FormLabel>
        <Select onValueChange={console.log} defaultValue={general.darkMode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
          </SelectContent>
        </Select>
        <SelectContent
          <Form.Select
          name="darkMode"
          label="Dark mode"
          defaultValue={general.darkMode}
          items={["auto", "dark", "light"]}
        />
      </div>

      <div className="w-80">
        <AutoSubmitTextInput
          name="autostart"
          label="Start automatically on boot"
          successLabel="Saved"
          value={general.autostart}
          callback={async (autostart: boolean) =>
            await invoke("settings_set", { params: { autostart } })
          }
        />
      </div>

      <div className="w-80">
        <AutoSubmitTextInput
          name="startMinimized"
          label="Start minimized"
          successLabel="Saved"
          value={general.startMinimized}
          callback={async (startMinimized: boolean) =>
            await invoke("settings_set", { params: { startMinimized } })
          }
        />
      </div>

      <AutoSubmitTextInput
        name="alchemyApiKey"
        label="Alchemy API Key"
        successLabel="Saved"
        value={general.alchemyApiKey || ""}
        callback={async (alchemyApiKey: string) =>
          await invoke("settings_set", { params: { alchemyApiKey } })
        }
      />

      <AutoSubmitTextInput
        name="etherscanApiKey"
        label="Etherscan API Key"
        successLabel="Saved"
        value={general.etherscanApiKey || ""}
        callback={async (etherscanApiKey: string) =>
          await invoke("settings_set", { params: { etherscanApiKey } })
        }
      />

      <div className="w-80">
        <AutoSubmitTextInput
          name="hideEmptyTokens"
          label="Hide Tokens Without Balance"
          successLabel="Saved"
          value={general.hideEmptyTokens}
          callback={async (hideEmptyTokens: boolean) =>
            await invoke("settings_set", { params: { hideEmptyTokens } })
          }
        />
      </div>

      <AutoSubmitTextInput
        name="rustLog"
        label="Rust log level (tracing_subscriber)"
        successLabel="Saved"
        value={general.rustLog}
        callback={async (rustLog: string) =>
          await invoke("settings_set", { params: { rustLog } })
        }
      />

      <Form.Submit label="Save" />
    </Form>
  );
}
