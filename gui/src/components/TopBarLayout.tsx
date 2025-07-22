import type { ReactNode } from "react";

interface TopbarLayoutProps {
  children: ReactNode;
}

export function TopbarLayout({ children }: TopbarLayoutProps) {
  return (
    <div className="flex-col flex-1">
      <header
        className="fixed top-0 right-0 left-0 z-50 flex h-12 items-center border-border border-b bg-sidebar px-4"
        data-tauri-drag-region="true"
      />

      <div className="flex-1 overflow-hidden mt-12">{children}</div>
    </div>
  );
}
