import type { SvgIcon } from "@mui/material";

export interface Tab {
  path: string;
  label: string;
  icon: typeof SvgIcon;
}
