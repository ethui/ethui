import { useContext, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./shadcn/tooltip";
import { ClipboardContext } from "./providers/clipboard-provider";

export interface ClickToCopyProps {
  text: string | bigint | number;
  children: React.ReactNode;
}

export function ClickToCopy({ children, text, ...props }: ClickToCopyProps) {
  const { writeText } = useContext(ClipboardContext);
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
    writeText(text.toString());
  };

  return (
    <TooltipProvider>
      <Tooltip open={open}>
        <TooltipTrigger
          asChild
          onMouseEnter={() => setOpening(true)}
          onMouseLeave={() => setOpening(false)}
          {...props}
        >
          <span
            className="cursor-pointer"
            onClick={handleCopy}
            onKeyDown={handleCopy}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent asChild>
          <span>{copied ? "Copied to clipboard" : text.toString()}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
