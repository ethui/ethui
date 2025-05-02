import { Skeleton } from "@ethui/ui/components/shadcn/skeleton";
import { cn } from "@ethui/ui/lib/utils";

interface DatapointProps {
  label: string;
  value?: React.ReactNode | string;
  className?: string;
}

export function Datapoint({ label, value, className }: DatapointProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-muted-foreground">{label}</span>
      {value !== undefined && value}
      {value === undefined && <Skeleton className="h-4 w-[80%]" />}
    </div>
  );
}
