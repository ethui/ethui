import { FormControlLabel, Switch } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";

import { useSettings } from "@/store";

export function QuickFastModeToggle() {
  const fastMode = useSettings((s) => s.settings?.fastMode);

  const onChange = (data: React.ChangeEvent<HTMLInputElement>) => {
    invoke("settings_set_fast_mode", { mode: data.target.checked });
  };

  return (
    <FormControlLabel
      sx={{ pointerEvents: "auto" }}
      label="Fast mode"
      control={<Switch checked={fastMode} onChange={onChange} />}
    />
  );
}
