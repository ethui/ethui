import { AutoSubmitSwitch } from "@ethui/ui/components/form/auto-submit/switch";
import { AutoSubmitTextInput } from "@ethui/ui/components/form/auto-submit/text-input";
import { Label } from "@ethui/ui/components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/shadcn/select";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useInvoke } from "#/hooks/useInvoke";
import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/settings/_l/general")({
  beforeLoad: () => ({ breadcrumb: "General" }),
  component: () => <SettingsGeneral />,
});

function SettingsGeneral() {
  const general = useSettings((s) => s.settings!);
  const { data: isStacksEnabled } = useInvoke<boolean>("is_stacks_enabled");

  if (!general) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <div className="flex w-80 flex-row items-center justify-between">
          <Label className="w-full grow cursor-pointer leading-none">
            Dark mode
          </Label>
          <Select
            onValueChange={async (darkMode: string) => {
              try {
                await invoke("settings_set", { params: { darkMode } });
              } catch (err) {
                console.warn("Failed to update dark mode", err);
              }
            }}
            defaultValue={general.darkMode}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-80">
        <AutoSubmitSwitch
          name="autostart"
          label="Start automatically on boot"
          value={general.autostart}
          callback={async (autostart: boolean) =>
            await invoke("settings_set", { params: { autostart } })
          }
        />
      </div>

      <div className="w-80">
        <AutoSubmitSwitch
          name="startMinimized"
          label="Start minimized"
          value={general.startMinimized}
          callback={async (startMinimized: boolean) =>
            await invoke("settings_set", { params: { startMinimized } })
          }
        />
      </div>

      {isStacksEnabled && (
        <div className="w-80">
          <AutoSubmitSwitch
            name="runLocalStacks"
            label="Enable Stacks"
            value={general.runLocalStacks}
            callback={async (runLocalStacks: boolean) =>
              await invoke("settings_set", { params: { runLocalStacks } })
            }
          />
        </div>
      )}

      <div className="w-80">
        <AutoSubmitSwitch
          name="checkForUpdates"
          label="Check for updates automatically"
          value={general.checkForUpdates}
          callback={async (checkForUpdates: boolean) =>
            await invoke("settings_set", { params: { checkForUpdates } })
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
        <AutoSubmitSwitch
          name="hideEmptyTokens"
          label="Hide Tokens Without Balance"
          value={general.hideEmptyTokens}
          callback={async (hideEmptyTokens: boolean) =>
            await invoke("settings_set", { params: { hideEmptyTokens } })
          }
        />
      </div>
    </div>
  );
}
