import { createFileRoute } from "@tanstack/react-router";

import { AddressView } from "#/components/AddressView";
import { BalancesList } from "#/components/BalancesList";
import { useWallets } from "#/store/useWallets";
import { Button } from "@ethui/ui/components/shadcn/button";

export const Route = createFileRoute("/home/_l/account")({
  beforeLoad: () => ({ breadcrumb: "Account" }),
  component: Account,
});

function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <>
      <div className="flex justify-center gap-2 space-y-2">
        <AddressView address={address} />
      </div>
      <BalancesList />
    </>
  );
}
