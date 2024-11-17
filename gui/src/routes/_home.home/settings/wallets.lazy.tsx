import { createLazyFileRoute } from "@tanstack/react-router";
import { AppNavbar } from "#/components/AppNavbar";

import { SettingsWallets } from "#/components/Settings/Wallets";

export const Route = createLazyFileRoute("/_home/home/settings/wallets")({
  component: () => (
    <>
      <AppNavbar title="Settings » Wallets" />
      <div className="m-4">
        <SettingsWallets />
      </div>
    </>
  ),
});
