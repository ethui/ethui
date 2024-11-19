import type { ReactNode } from "react";

export function DialogBottom({ children }: { children: ReactNode }) {
  return <div className="fixed top-auto bottom-0 w-full">{children}</div>;
}
