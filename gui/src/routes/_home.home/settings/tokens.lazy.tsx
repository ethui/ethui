import { createLazyFileRoute } from "@tanstack/react-router";

import { invoke } from "@tauri-apps/api/core";
import type { Address } from "viem";
import { AppNavbar } from "#/components/AppNavbar";

import { Button } from "@ethui/ui/components/shadcn/button";
import { EyeOff } from "lucide-react";
import { AddressView } from "#/components/AddressView";
import { IconAddress } from "#/components/Icons/Address";
import { useBlacklist } from "#/store/useBlacklist";
import { useNetworks } from "#/store/useNetworks";

export const Route = createLazyFileRoute("/_home/home/settings/tokens")({
  component: () => (
    <>
      <AppNavbar title="Settings » Tokens" />
      <div className="m-4">
        <SettingsTokens />
      </div>
    </>
  ),
});

export function SettingsTokens() {
  const currentNetwork = useNetworks((s) => s.current);
  const blacklist = useBlacklist((s) => s.erc20Blacklist);

  if (!currentNetwork) return null;

  const unhide = (contract: Address) => {
    invoke("db_clear_erc20_blacklist", {
      chainId: currentNetwork.chain_id,
      address: contract,
    });
  };

  return (
    <ul className="w-full">
      {blacklist.map(({ contract, metadata }) => (
        <li
          key={contract}
          className="flex w-full items-center justify-between gap-5"
        >
          <IconAddress chainId={currentNetwork.chain_id} address={contract} />

          <span className="flex items-center gap-1">
            {metadata?.symbol}
            {contract && <AddressView address={contract} />}
          </span>

          <Button
            size="icon"
            title={"Unhide token"}
            onClick={() => unhide(contract)}
          >
            <EyeOff />
          </Button>
        </li>
      ))}
    </ul>
  );
}
