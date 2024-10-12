import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import { ContextMenu, ContextMenuProps } from "@ethui/react/components";

export interface ContextMenuWithTauriProps extends ContextMenuProps {}

export function ContextMenuWithTauri(props: ContextMenuWithTauriProps) {
  return <ContextMenu clipboard={{ writeText }} {...props} />;
}
