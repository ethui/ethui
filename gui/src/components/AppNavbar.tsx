import { Breadcrumbs } from "./Breadcrumbs";

export function AppNavbar() {
  return (
    <header
      data-tauri-drag-region="true"
      className="sticky top-0 z-10 flex h-10 w-full items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pl-4"
    >
      <Breadcrumbs />
    </header>
  );
}
