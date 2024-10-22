import clsx from "clsx";

export interface HighlightBoxProps {
  children: React.ReactNode;
  className?: string;
}

export function HighlightBox({ children, className }: HighlightBoxProps) {
  return (
    <div className={clsx("max-w-full p-2 bg-gray-200 rounded-md", className)}>
      {children}
    </div>
  );
}
