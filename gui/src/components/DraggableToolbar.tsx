import { Toolbar } from "@mui/material";

export function DraggableToolbar(props: Parameters<typeof Toolbar>[0]) {
  return <Toolbar data-tauri-drag-region="true" {...props} />;
}
