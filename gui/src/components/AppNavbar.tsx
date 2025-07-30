import { Breadcrumbs } from "./Breadcrumbs";

export function AppNavbar() {
  return (
    <header
      data-tauri-drag-region="true"
      className="sticky top-12 z-10 flex h-10 w-full select-none items-center bg-background/95 pl-2 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <Breadcrumbs />
    </header>
  );
}
