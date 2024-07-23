import { createFileRoute } from "@tanstack/react-router";

import { useWallets } from "@/store";
import { AddressView, BalancesList } from "@/components";
import { Navbar } from "@/components/Home/Navbar";

export const Route = createFileRoute("/_home/home/account")({
  component: Account,
});

export function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <>
      <Navbar homepage-tour="account">
        <AddressView variant="h6" address={address} />
      </Navbar>
      <BalancesList />
    </>
  );
}
