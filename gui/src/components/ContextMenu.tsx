import { Button, Menu, MenuItem, SxProps, Tooltip } from "@mui/material";
import { writeText } from "@tauri-apps/api/clipboard";
import React, { MouseEvent, ReactNode, useState } from "react";

import { useCurrentNetwork } from "../hooks/useCurrentNetwork";
import { useNetworks } from "../hooks/useNetworks";

interface Props {
  children: ReactNode;
  copy?: string;
  explorer?: string;
  sx?: SxProps;
  actions?: CustomAction[];
}

interface CustomAction {
  label: string;
  action: () => unknown;
  disabled?: boolean;
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

export function ContextMenu({ children, sx, copy, explorer, actions }: Props) {
  const { currentNetwork } = useCurrentNetwork();
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    target: HTMLElement;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const contextMenuOpen = Boolean(contextMenu?.target);
  const tooltipDelay = copied ? 0 : contextMenuOpen ? Infinity : 600;

  const copyToClipboard = (text: string | null | undefined) => {
    if (!text) throw new Error("Nothing to copy to clipboard");

    writeText(text);
    setCopied(true);
    setContextMenu(null);
  };

  const onContextCopy = () => copyToClipboard(copy);

  const onCopyText = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    copyToClipboard(copy);
  };

  const onCloseMenu = () => setContextMenu(null);

  const onContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setContextMenu(null);

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

  const onAction = (
    e: MouseEvent<HTMLAnchorElement>,
    action: () => unknown
  ) => {
    e.preventDefault();
    setContextMenu(null);
    action();
  };

  return (
    <>
      <Tooltip
        onClose={() => setTimeout(() => setCopied(false), 500)}
        title={copy && copied ? "Copied to clipboard" : copy}
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
          {/* copy to clipboard */}
          {copy && <MenuItem onClick={onContextCopy}>Copy</MenuItem>}

          {/* open in explorer */}
          {currentNetwork?.explorer_url && explorer && (
            <MenuItem
              component="a"
              target="_blank"
              href={`${currentNetwork.explorer_url}${explorer}`}
              rel="noreferrer"
              onClick={onCloseMenu}
            >
              Open in explorer
            </MenuItem>
          )}

          {/* custom actions */}
          {actions &&
            actions
              .filter(({ disabled }) => !disabled)
              .map(({ label, action }) => (
                <MenuItem
                  component="a"
                  key={label}
                  onClick={(e) => onAction(e, action)}
                >
                  {label}
                </MenuItem>
              ))}
        </Menu>
      )}
    </>
  );
}
