import { Label } from "@ethui/ui/components/shadcn/label";
import { Switch } from "@ethui/ui/components/shadcn/switch";
import { invoke } from "@tauri-apps/api/core";

import { useSettings } from "#/store/useSettings";

export function QuickFastModeToggle() {
  const fastMode = useSettings((s) => s.settings?.fastMode);

  const onChange = (checked: boolean) => {
    invoke("settings_set_fast_mode", { mode: checked });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        defaultChecked={fastMode}
        checked={fastMode}
        onCheckedChange={onChange}
        id="fast-mode"
      />
      <Label htmlFor="fast-mode" className="cursor-pointer">
        Fast mode
      </Label>
    </div>
  );
}
