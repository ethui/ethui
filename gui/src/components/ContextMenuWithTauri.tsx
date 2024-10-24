import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import {
  ContextMenu,
  type ContextMenuProps,
} from "@ethui/react/components/ContextMenu";

export interface ContextMenuWithTauriProps extends ContextMenuProps {}

export function ContextMenuWithTauri(props: ContextMenuWithTauriProps) {
  return <ContextMenu clipboard={{ writeText }} {...props} />;
}
