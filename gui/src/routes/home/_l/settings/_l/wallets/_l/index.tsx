import { createFileRoute } from "@tanstack/react-router";

import { SettingsWallets } from "#/components/Settings/Wallets";

export const Route = createFileRoute("/home/_l/settings/_l/wallets/_l/")({
  beforeLoad: () => ({ breadcrumb: "Wallets" }),
  component: () => <SettingsWallets />,
});
