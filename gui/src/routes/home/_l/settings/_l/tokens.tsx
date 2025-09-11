import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { EyeOff } from "lucide-react";
import type { Address } from "viem";
import { AddressView } from "#/components/AddressView";
import { IconAddress } from "#/components/Icons/Address";
import { useBlacklist } from "#/store/useBlacklist";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/home/_l/settings/_l/tokens")({
  beforeLoad: () => ({ breadcrumb: "Tokens" }),
  component: () => <SettingsTokens />,
});

function SettingsTokens() {
  const currentNetwork = useNetworks((s) => s.current);
  const blacklist = useBlacklist((s) => s.erc20Blacklist);

  if (!currentNetwork) return null;

  const unhide = (contract: Address) => {
    invoke("db_clear_erc20_blacklist", {
      chainId: currentNetwork.dedup_chain_id.chain_id,
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
          <IconAddress
            chainId={currentNetwork.dedup_chain_id.chain_id}
            address={contract}
          />

          <span className="flex items-center gap-1">
            {metadata?.symbol}
            {contract && <AddressView showLinkExplorer address={contract} />}
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
