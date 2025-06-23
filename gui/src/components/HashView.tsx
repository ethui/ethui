import { ClickToCopy } from "@ethui/ui/components/click-to-copy";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ethui/ui/components/shadcn/context-menu";
import { Link } from "@tanstack/react-router";
import * as tauriClipboard from "@tauri-apps/plugin-clipboard-manager";
import type { Hash } from "viem";
import { useNetworks } from "#/store/useNetworks";
import { truncateHex } from "#/utils";

interface Props {
  hash: Hash;
  truncate?: boolean;
}

export function HashView({ hash, truncate = true }: Props) {
  const network = useNetworks((s) => s.current);

  if (!network) return null;

  const content = (
    <ClickToCopy text={hash}>
      <div className="font-mono">{truncate ? truncateHex(hash) : hash}</div>
    </ClickToCopy>
  );

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
