import { Button } from "@ethui/ui/components/shadcn/button";
import { useSidebar } from "@ethui/ui/components/shadcn/sidebar";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import clsx from "clsx";
import { useIsMobile } from "#/hooks/use-mobile";
import { Breadcrumbs } from "./Breadcrumbs";

export function AppNavbar() {
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  return (
    <header
      data-tauri-drag-region="true"
      className="sticky top-0 z-10 flex h-10 w-full items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <Button
        className={clsx(!isMobile && "hidden")}
        variant="ghost"
        onClick={() => sidebar.toggleSidebar()}
      >
        <HamburgerMenuIcon />
      </Button>
      <Breadcrumbs />
    </header>
  );
}
