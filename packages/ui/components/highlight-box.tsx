import clsx from "clsx";

export interface HighlightBoxProps {
  children: React.ReactNode;
  className?: string;
}

export function HighlightBox({ children, className }: HighlightBoxProps) {
  return (
    <div className={clsx("max-w-full bg-accent p-2", className)}>
      {children}
    </div>
  );
}
