import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useSidebar } from "./ui/sidebar";
import { Button } from "@ethui/ui/components/ui/button";
import { useIsMobile } from "#/hooks/use-mobile";
import clsx from "clsx";

interface NavbarProps {
  title: React.ReactNode;
}

export function AppNavbar({ title }: NavbarProps) {
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  return (
    <header
      data-tauri-drag-region="true"
      className="w-full sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary"
    >
      <div className="flex h-14 items-center">
        <Button
          className={clsx(!isMobile && "hidden")}
          variant=" ghost"
          onClick={() => sidebar.toggleSidebar()}
        >
          <HamburgerMenuIcon />
        </Button>
        <div className="md:mx-4 flex items-center space-x-4 space-x-0">
          <h1 className="font-bold">{title}</h1>
        </div>
      </div>
    </header>
  );
}
