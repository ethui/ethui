import type { ReactNode } from "react";

interface TopbarLayoutProps {
  children: ReactNode;
}

export function TopbarLayout({ children }: TopbarLayoutProps) {
  return (
    <>
      <header
        className="fixed top-0 right-0 left-0 z-50 flex h-12 items-center border-border border-b bg-sidebar px-4"
        data-tauri-drag-region="true"
      />

      <div className="flex h-screen flex-1 overflow-hidden pt-12">
        {children}
      </div>
    </>
  );
}
