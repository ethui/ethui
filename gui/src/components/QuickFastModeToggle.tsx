import { AutoSubmitSwitch } from "@ethui/ui/components/form/auto-submit/switch";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "#/store/useSettings";

export function QuickFastModeToggle() {
  const fastMode = useSettings((s) => s.settings?.fastMode);

  // if settings aren't loaded yet, avoid rendering
  if (fastMode === undefined) return null;

  return (
    <AutoSubmitSwitch
      name="fastMode"
      label="Fast Mode"
      value={fastMode}
      callback={async (fastMode: boolean) =>
        await invoke("settings_set_fast_mode", { mode: fastMode })
      }
    />
  );
}
