import type { ReactNode } from "react";

export function Panel({ children }: { children: ReactNode }) {
  return <div className="min-h-80 px-4 pt-2 pb-4">{children}</div>;
}
