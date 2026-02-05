import { cn } from "@ethui/ui/lib/utils";

interface EmptyStateProps {
  message: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  message,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mt-8 flex flex-col items-start px-2 text-left",
        className,
      )}
    >
      <div className="mb-2 text-lg text-muted-foreground">{message}</div>
      {description && (
        <div className="text-muted-foreground text-sm">{description}</div>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}
