import { AutoSubmitTextInput } from "@ethui/ui/components/form/auto-submit/text-input";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/settings/_l/logging")({
  beforeLoad: () => ({ breadcrumb: "Logging" }),
  component: SettingsLogging,
});

function SettingsLogging() {
  const settings = useSettings((s) => s.settings);

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-4">
      <AutoSubmitTextInput
        name="rustLog"
        label="Rust log level"
        successLabel="Saved"
        value={settings.rustLog}
        callback={async (rustLog: string) =>
          await invoke("settings_set", { params: { rustLog } })
        }
      />
    </div>
  );
}
