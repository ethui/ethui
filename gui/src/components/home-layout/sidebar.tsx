"use client";
import { Menu } from "#/components/home-layout/menu";
import { SidebarToggle } from "#/components/home-layout/sidebar-toggle";
import { useSidebar } from "#/hooks/use-sidebar";
import { useStore } from "#/hooks/use-store";
import { useOS } from "#/hooks/useOS";
import { cn } from "#/lib/utils";
import { Logo } from "../Logo";

export function Sidebar() {
  const { type } = useOS();
  const sidebar = useStore(useSidebar, (x) => x);
  if (!sidebar) return null;
  const { isOpen, toggleOpen, getOpenState, setIsHover } = sidebar;
  return (
    <aside
      className={cn(
        "-translate-x-full fixed top-0 left-0 z-20 h-screen transition-[width] duration-300 ease-in-out translate-x-0",
        !getOpenState() ? "w-[90px]" : "w-72",
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative flex h-full flex-col overflow-y-auto px-3 py-4 shadow-md dark:shadow-zinc-800"
      >
        {type !== "macos" && (
          <div className="flex justify-center  gap-2">
            <h1 className="textwhitespace-nowrap font-bold text-lg transition-[transform,opacity,display] duration-300 ease-in-out translate-x-0 opacity-100">
              <Logo width={40} />
            </h1>
          </div>
        )}
        <Menu isOpen={getOpenState()} />
      </div>
    </aside>
  );
}
