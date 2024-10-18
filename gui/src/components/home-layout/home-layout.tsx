"use client";

import { Sidebar } from "#/components/home-layout/sidebar";
import { useSidebar } from "#/hooks/use-sidebar";
import { useStore } from "#/hooks/use-store";
import { cn } from "#/lib/utils";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  if (!sidebar) return null;
  const { getOpenState } = sidebar;
  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen bg-zinc-50 transition-[margin-left] duration-300 ease-in-out dark:bg-zinc-900",
          !getOpenState() ? "ml-[90px]" : "ml-72",
        )}
      >
        {children}
      </main>
    </>
  );
}
