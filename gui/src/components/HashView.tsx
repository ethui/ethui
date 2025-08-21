import { ClickToCopy } from "@ethui/ui/components/click-to-copy";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ethui/ui/components/shadcn/context-menu";
import { cn } from "@ethui/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import * as tauriClipboard from "@tauri-apps/plugin-clipboard-manager";
import type { Hash } from "viem";
import { useNetworks } from "#/store/useNetworks";
import { truncateHex } from "#/utils";

interface Props {
  hash: Hash;
  truncate?: boolean;
  showLinkExplorer?: boolean;
}

export function HashView({
  hash,
  truncate = true,
  showLinkExplorer = false,
}: Props) {
  const network = useNetworks((s) => s.current);

  if (!network) return null;

  const hashContent = (
    <div
      className={cn(
        "font-mono",
        showLinkExplorer && "text-solidity-value hover:text-sky-700",
      )}
    >
      {truncate ? truncateHex(hash) : hash}
    </div>
  );

  const content = showLinkExplorer ? (
    <ClickToCopy text={hash}>
      <Link params={{ hash }} to="/home/explorer/transactions/$hash">
        {hashContent}
      </Link>
    </ClickToCopy>
  ) : (
    <ClickToCopy text={hash}>{hashContent}</ClickToCopy>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger className="cursor-pointer">
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => tauriClipboard.writeText(hash)}>
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
