import { Button, SxProps, Tooltip } from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import React, { ReactNode, useState } from "react";

export function CopyToClipboard({
  children,
  label,
  sx,
}: {
  children: ReactNode;
  label?: string;
  sx?: SxProps;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (label) {
      writeText(label);
    } else if (event?.currentTarget?.textContent) {
      writeText(event.currentTarget.textContent);
    } else {
      throw new Error("Nothing to copy to clipboard");
    }

    setCopied(true);
  };

  return (
    <Tooltip
      onClose={() => setTimeout(() => setCopied(false), 500)}
      title={copied ? "Copied to clipboard" : "Copy to clipboard"}
      arrow
      enterDelay={copied ? 0 : 800}
      enterNextDelay={copied ? 0 : 800}
    >
      <Button
        disableRipple
        disableFocusRipple
        disableElevation
        sx={{
          background: "transparent",
          p: 0,
          color: "inherit",
          fontWeight: "inherit",
          fontSize: "inherit",
          border: 0,
          minWidth: "inherit",
          ...sx,
        }}
        onClick={copyToClipboard}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
