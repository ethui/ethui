import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ethui/ui/components/shadcn/context-menu";
import * as tauriClipboard from "@tauri-apps/plugin-clipboard-manager";
import type { Hash } from "viem";

import { Link } from "@tanstack/react-router";
import { useNetworks } from "#/store/useNetworks";
import { truncateHex } from "#/utils";

interface Props {
  hash: Hash;
}

export function HashView({ hash }: Props) {
  const network = useNetworks((s) => s.current);

  if (!network) return null;

  const content = <span className="font-mono">{truncateHex(hash)}</span>;

  return (
    <ContextMenu>
      <ContextMenuTrigger className="cursor-pointer">
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem asChild onClick={() => tauriClipboard.writeText(hash)}>
          Copy to clipboard
        </ContextMenuItem>
        <ContextMenuItem>
          <Link target="_blank" to={`${network.explorer_url}${hash}`}>
            Open in explorer
          </Link>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
