import { clipboard } from "@tauri-apps/api";

import { ContextMenu, type ContextMenuProps } from "@ethui/react/components";

export interface ContextMenuWithTauriProps extends ContextMenuProps {}

export function ContextMenuWithTauri(props: ContextMenuWithTauriProps) {
  return <ContextMenu clipboard={clipboard} {...props} />;
}
