import { UserNav } from "#/components/home-layout/user-nav";
import { ModeToggle } from "#/components/mode-toggle";

interface NavbarProps {
  title: React.ReactNode;
}

export function Navbar({ title }: NavbarProps) {
  return (
    <header
      data-tauri-drag-region="true"
      className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary"
    >
      <div className="mx-4 flex h-14 items-center sm:mx-8">
        <div className="flex items-center space-x-4 space-x-0">
          <h1 className="font-bold">{title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
