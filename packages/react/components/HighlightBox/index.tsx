import clsx from "clsx";

export interface HighlightBoxProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}
export function HighlightBox({ children, fullWidth }: HighlightBoxProps) {
  return (
    <div className={clsx("max-w-full p-2", fullWidth && "w-full")}>
      {children}
    </div>
  );
}
