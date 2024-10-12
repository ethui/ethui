import {
  Menu,
  MenuItem,
  type MenuItemProps,
  type SxProps,
} from "@mui/material";
import type React from "react";
import { type MouseEvent, type ReactNode, useState } from "react";

import { ClickToCopy } from "@ethui/react/components";

export interface ContextMenuProps {
  children: ReactNode;
  copy?: string | bigint | number;
  sx?: SxProps;
  actions?: CustomAction[];
  clipboard?: { writeText: (s: string) => void };
}

interface CustomAction {
  label: string;
  action?: () => unknown;
  href?: string;
  disabled?: boolean;
}

export function ContextMenu({
  children,
  copy,
  actions = [],
  clipboard = navigator.clipboard,
}: ContextMenuProps) {
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const handleClose = () => setContextMenu(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setContextMenu(null);

    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null,
    );
  };

  const handleCopy = (e: MouseEvent) =>
    handleAction(e, () => copy && clipboard.writeText(copy.toString()));

  const handleAction = (e: MouseEvent, action: () => unknown) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu(null);
    action();
  };

  return (
    <>
      {copy ? (
        <ClickToCopy
          text={copy}
          onContextMenu={handleContextMenu}
          write={clipboard.writeText}
        >
          {children}
        </ClickToCopy>
      ) : (
        children
      )}

      <Menu
        id="basic-menu"
        anchorReference="anchorPosition"
        open={contextMenu !== null}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {!!copy && (
          <MenuItem component="a" onClick={handleCopy}>
            Copy
          </MenuItem>
        )}

        {actions
          .filter(({ disabled }) => !disabled)
          .map(({ label, action, href }, i: number) => {
            const props: MenuItemProps<"a"> = {};
            if (href) {
              props.href = href;
              props.target = "_blank";
            } else if (action) {
              props.onClick = (e) => handleAction(e, action);
            }
            return (
              <MenuItem key={i} component="a" {...props}>
                {label}
              </MenuItem>
            );
          })}
      </Menu>
    </>
  );
}
