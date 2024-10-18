import { createFileRoute } from "@tanstack/react-router";

import { AddressView } from "#/components/AddressView";
import { BalancesList } from "#/components/BalancesList";
import { useWallets } from "#/store/useWallets";
import { ContentLayout } from "#/components/home-layout/content-layout";

export const Route = createFileRoute("/_home/home/account")({
  component: Account,
});

export function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <ContentLayout title={<AddressView address={address} />}>
      <BalancesList />
    </ContentLayout>
  );
}
