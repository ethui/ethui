import { Breadcrumbs } from "./Breadcrumbs";

export function AppNavbar() {
  return (
    <header
      data-tauri-drag-region="true"
      className="sticky top-0 z-10 flex h-10 w-full items-center bg-background/95 pl-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <Breadcrumbs />
    </header>
  );
}
