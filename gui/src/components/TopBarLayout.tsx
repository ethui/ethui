interface TopbarProps {
  onWalletClick?: () => void;
}

export function Topbar({ onWalletClick }: TopbarProps) {
  return (
    <header
      className="fixed top-0 right-0 left-0 z-50 flex h-12 items-center justify-between border-border border-b bg-sidebar px-10"
      data-tauri-drag-region="true"
    >
      <div></div> {/* Left side - empty for now */}
      {/* Wallet button rectangle on far right */}
      <div
        className="h-8 w-32 bg-muted rounded border cursor-pointer hover:bg-muted/80 transition-colors flex items-center justify-center text-sm"
        onClick={onWalletClick}
        data-tauri-drag-region="false"
      >
        Wallet
      </div>
    </header>
  );
}
