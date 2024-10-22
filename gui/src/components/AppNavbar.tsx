import { Button } from "@ethui/ui/components/shadcn/button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import clsx from "clsx";
import { useIsMobile } from "#/hooks/use-mobile";
import { useSidebar } from "#/components/shadcn/sidebar";

interface NavbarProps {
  title: React.ReactNode;
}

export function AppNavbar({ title }: NavbarProps) {
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  return (
    <header
      data-tauri-drag-region="true"
      className="sticky top-0 z-10 w-full w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary"
    >
      <div className="flex h-14 items-center">
        <Button
          className={clsx(!isMobile && "hidden")}
          variant="ghost"
          onClick={() => sidebar.toggleSidebar()}
        >
          <HamburgerMenuIcon />
        </Button>
        <div className="flex items-center space-x-0 space-x-4 md:mx-4">
          <h1 className="font-bold">{title}</h1>
        </div>
      </div>
    </header>
  );
}
