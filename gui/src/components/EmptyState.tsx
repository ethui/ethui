import { cn } from "@ethui/ui/lib/utils";

interface EmptyStateProps {
  message: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  message,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-64 flex-col items-center justify-center text-center",
        className,
      )}
    >
      <div className="mb-2 text-lg text-muted-foreground">{message}</div>
      {description && (
        <div className="text-muted-foreground text-sm">{description}</div>
      )}
    </div>
  );
}
