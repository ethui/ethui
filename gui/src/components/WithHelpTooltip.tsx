import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ethui/ui/components/shadcn/tooltip";
import { cn } from "@ethui/ui/lib/utils";
import { Info } from "lucide-react";

interface WithHelpTooltipProps {
  children: React.ReactNode;
  helpText: string;
  className?: string;
}

export function WithHelpTooltip({
  children,
  helpText,
  className,
}: WithHelpTooltipProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{helpText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
