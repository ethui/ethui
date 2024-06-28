import { Tooltip, Button, type TooltipProps } from "@mui/material";
import { useEffect, useState } from "react";

export interface ClickToCopyProps
  extends Omit<TooltipProps, "title" | "children"> {
  text: string | bigint | number;
  children: React.ReactNode;
  write?: (text: string) => void;
}

export function ClickToCopy({
  children,
  text,
  write = navigator.clipboard.writeText,
  ...props
}: ClickToCopyProps) {
  const [opening, setOpening] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!opening) {
      // close immediately,
      // but delay the copy change since the tooltip has a long fade-out transition
      setOpen(false);
      timeout = setTimeout(() => {
        setCopied(false);
      }, 300);
    } else {
      // open after some delay
      timeout = setTimeout(() => {
        setOpen(opening);
      }, 500);
    }
    return () => clearTimeout(timeout);
  }, [opening]);

  const handleCopy = () => {
    setCopied(true);
    setOpening(true);
    setOpen(true);
    write(text.toString());
  };

  return (
    <Tooltip
      onMouseEnter={() => setOpening(true)}
      onMouseLeave={() => setOpening(false)}
      open={open}
      title={copied ? "Copied to clipboard" : text.toString()}
      arrow
      {...props}
    >
      <Button
        disableTouchRipple
        disableFocusRipple
        sx={{ transition: "none", ...buttonSx }}
        onClick={handleCopy}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

const buttonSx = {
  p: 0,
  color: "inherit",
  fontWeight: "inherit",
  fontSize: "inherit",
  textTransform: "none",
  minWidth: "inherit",
};
