import type { Wallet } from "@ethui/types/wallets";
import { cn } from "@ethui/ui/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { WalletNew } from "./-components/New";

const walletTypes: Array<{
  type: Wallet["type"];
  label: string;
  description: string;
}> = [
  {
    type: "HDWallet",
    label: "HD Wallet",
    description:
      "Hierarchical Deterministic wallet from a seed phrase. Generate multiple accounts from one seed.",
  },
  {
    type: "jsonKeystore",
    label: "JSON Keystore",
    description:
      "Encrypted wallet file protected by a password. Secure storage compatible with most Ethereum tools.",
  },
  {
    type: "plaintext",
    label: "Plaintext",
    description:
      "Store private key in plain text. Only use for testing - NOT SECURE for real funds.",
  },

  {
    type: "ledger",
    label: "Ledger",
    description:
      "Hardware wallet support. Keep your keys on a physical device for maximum security.",
  },
  {
    type: "privateKey",
    label: "Private Key",
    description:
      "Import a single private key directly. Use for one-off accounts or testing.",
  },
  {
    type: "impersonator",
    label: "Impersonator",
    description:
      "Simulate transactions as any address without needing keys. For testing and debugging only.",
  },
];

export const Route = createFileRoute("/home/_l/wallets/_l/new")({
  beforeLoad: ({ search }) => {
    const walletType = walletTypes.find((w) => w.type === search.type);
    return {
      breadcrumb: walletType ? walletType.label : "New",
    };
  },
  validateSearch: (search: Record<string, string>) => {
    return {
      type: search.type || "HDWallet",
    };
  },

  component: () => {
    const { type } = Route.useSearch();

    return (
      <div className="flex gap-6">
        <WalletTypeSelector selectedType={type} />
        <div className="min-w-0 flex-1">
          <WalletNew type={type} />
        </div>
      </div>
    );
  },
});

function WalletTypeSelector({ selectedType }: { selectedType?: string }) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 w-72 flex-shrink-0 space-y-1.5 self-start">
      {walletTypes.map(({ type, label, description }) => {
        const isSelected = type === selectedType;
        return (
          <button
            key={type}
            type="button"
            onClick={() =>
              navigate({
                to: "/home/wallets/new",
                search: { type },
              })
            }
            className={cn(
              "group flex w-full cursor-pointer items-start justify-between gap-3 border px-3 py-2.5 text-left transition-colors hover:bg-accent",
              isSelected
                ? "border-primary bg-accent"
                : "border-border bg-background",
            )}
          >
            <div className="flex-1 space-y-0.5">
              <div className="font-bold text-sm">{label}</div>
              <div className="text-muted-foreground text-xs leading-snug">
                {description}
              </div>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1",
                isSelected && "translate-x-1",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
