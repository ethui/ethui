import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { AddressView } from "#/components/AddressView";
import { BalancesList } from "#/components/BalancesList";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/home/_l/account")({
  beforeLoad: () => ({ breadcrumb: "Account" }),
  component: Account,
});

function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2 space-y-2">
        <AddressView className="text-lg" address={address} />
      </div>

      <div className="flex justify-center">
        <Link to="/home/explorer/addresses/$address" params={{ address }}>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            View Transactions
          </Button>
        </Link>
      </div>

      <BalancesList />
    </div>
  );
}
