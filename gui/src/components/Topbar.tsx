interface TopbarProps {
  onWalletClick?: () => void;
}

export function Topbar({ onWalletClick }: TopbarProps) {
  return (
    <header
      className="fixed top-0 right-0 left-0 z-20 flex h-12 items-center justify-end border-border border-b bg-sidebar px-10"
      data-tauri-drag-region="true"
    >
      <div
        className="flex h-8 w-32 cursor-pointer items-center justify-center rounded border bg-muted text-sm transition-colors hover:bg-muted/80"
        onClick={onWalletClick}
        data-tauri-drag-region="false"
      >
        Wallet
      </div>
    </header>
  );
}
