import { Button, Menu, MenuItem, SxProps, Tooltip } from "@mui/material";
import { writeText } from "@tauri-apps/api/clipboard";
import React, { MouseEvent, ReactNode, useState } from "react";

import { useNetworks } from "../hooks/useNetworks";

interface Props {
  children: ReactNode;
  sx?: SxProps;
  label?: string;
}

const buttonSx = {
  background: "transparent",
  p: 0,
  color: "inherit",
  fontWeight: "inherit",
  fontSize: "inherit",
  border: 0,
  minWidth: "inherit",
};

export function ContextMenu({ children, sx, label }: Props) {
  const { network } = useNetworks();
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    target: HTMLElement;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const contextMenuOpen = Boolean(contextMenu?.target);
  const tooltipDelay = copied ? 0 : contextMenuOpen ? Infinity : 1200;

  const copyToClipboard = (text: string | null | undefined) => {
    if (!text) throw new Error("Nothing to copy to clipboard");

    writeText(text);
    setCopied(true);
    setContextMenu(null);
  };

  const onContextCopy = () =>
    copyToClipboard(label || contextMenu?.target.textContent);

  const onCopyText = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    copyToClipboard(label || event.currentTarget?.textContent);
  };

  const onCloseMenu = () => setContextMenu(null);

  const onContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    setContextMenu(
      contextMenu === null
        ? {
            target: e.currentTarget,
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
          }
        : null
    );
  };

  return (
    <>
      <Tooltip
        onClose={() => setTimeout(() => setCopied(false), 500)}
        title={copied ? "Copied to clipboard" : "Copy to clipboard"}
        arrow
        enterDelay={tooltipDelay}
        enterNextDelay={tooltipDelay}
        leaveDelay={0}
      >
        <Button
          disableRipple
          disableFocusRipple
          disableElevation
          sx={{ ...buttonSx, ...sx }}
          onClick={onCopyText}
          onContextMenu={onContextMenu}
        >
          {children}
        </Button>
      </Tooltip>
      {contextMenu?.target && (
        <Menu
          id="basic-menu"
          anchorEl={contextMenu?.target}
          open={contextMenuOpen}
          onClose={onCloseMenu}
          MenuListProps={{
            "aria-labelledby": "basic-button",
          }}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu !== null
              ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
              : undefined
          }
        >
          <MenuItem onClick={onContextCopy}>Copy</MenuItem>
          {network?.explorer_url && (
            <MenuItem
              component="a"
              target="_blank"
              href={
                network.explorer_url +
                (label || contextMenu?.target.textContent)
              }
              rel="noreferrer"
              onClick={onCloseMenu}
            >
              Open in explorer
            </MenuItem>
          )}
        </Menu>
      )}
    </>
  );
}
