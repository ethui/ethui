import { Button } from "@ethui/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ethui/ui/components/shadcn/dropdown-menu";
import { ArrowTopRightIcon, DotsVerticalIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { type Address, formatUnits } from "viem";
import { useNetworks } from "#/store/useNetworks";
import { AddressView } from "./AddressView";
import { IconAddress } from "./Icons/Address";

interface Props {
  chainId: number;
  contract?: Address;
  symbol?: string;
  balance: bigint;
  decimals?: number;
}

const minimum = 0.001;

export function ERC20View({
  chainId,
  contract,
  symbol,
  balance,
  decimals,
}: Props) {
  const network = useNetworks((s) => s.current);

  if (!symbol || !decimals || !network) return null;

  const truncatedBalance =
    balance - (balance % BigInt(Math.ceil(minimum * 10 ** decimals)));

  const blacklist = () => {
    invoke("db_set_erc20_blacklist", {
      chainId: network.dedup_chain_id.chain_id,
      address: contract,
      blacklisted: true,
    });
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-accent">
      <div className="flex items-center gap-2">
        <IconAddress chainId={chainId} address={contract} />
        <div className="flex flex-col">
          <div className="items-bottom flex gap-4">
            {symbol}
            {contract && <AddressView address={contract} />}
          </div>
          <span>
            {truncatedBalance > 0
              ? formatUnits(truncatedBalance, decimals)
              : `< ${minimum}`}
          </span>
        </div>
      </div>

      <div className="flex">
        {contract && (
          <Button variant="ghost" size="icon" asChild>
            <Link to="/home/transfer/erc20" search={{ contract }}>
              <ArrowTopRightIcon />
            </Link>
          </Button>
        )}
        {!contract && (
          <Button variant="ghost" size="icon" asChild>
            <Link to="/home/transfer/eth">
              <ArrowTopRightIcon />
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <DotsVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {contract && network?.explorer_url && (
              <DropdownMenuItem asChild>
                <a href={`${network.explorer_url}${contract}`}>
                  Open on explorer
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={blacklist}>Hide token</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
