import { createFileRoute } from "@tanstack/react-router";

import { AddressView } from "#/components/AddressView";
import { BalancesList } from "#/components/BalancesList";
import { Navbar } from "#/components/Home/Navbar";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/_home/home/account")({
  component: Account,
});

export function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <>
      <Navbar>
        <AddressView variant="h6" address={address} />
      </Navbar>
      <BalancesList />
    </>
  );
}
