import { IconButton, Menu, MenuItem } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { type Address, formatUnits } from "viem";

import { useNetworks } from "#/store/useNetworks";
import { AddressView } from "./AddressView";
import { CopyToClipboard } from "./CopyToClipboard";
import { IconAddress } from "./Icons/Address";
import { Modal } from "./Modal";
import { TransferForm } from "./TransferForm";
import { ArrowTopRightIcon, DotsVerticalIcon } from "@radix-ui/react-icons";
import { Button } from "@ethui/ui/components/ui/button";

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
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const network = useNetworks((s) => s.current);

  if (!symbol || !decimals || !network) return null;

  const truncatedBalance =
    balance - (balance % BigInt(Math.ceil(minimum * 10 ** decimals)));

  const onMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setMenuAnchor(event.currentTarget);

  const blacklist = () => {
    invoke("db_set_erc20_blacklist", {
      chainId: network.chain_id,
      address: contract,
      blacklisted: true,
    });
    setMenuAnchor(null);
  };

  return (
    <div className="flex items-center mb-5">
      <div className="flex items-center">
        <IconAddress chainId={chainId} address={contract} />
        <div className="flex flex-col">
          <div className="flex items-bottom">
            {symbol}
            {contract && (
              <>
                (<AddressView address={contract} />)
              </>
            )}
          </div>
          <span>
            <CopyToClipboard label={balance.toString()}>
              {truncatedBalance > 0
                ? formatUnits(truncatedBalance, decimals)
                : `< ${minimum}`}
            </CopyToClipboard>
          </span>
        </div>
      </div>

      <div className="flex ">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTransferFormOpen(true)}
        >
          <ArrowTopRightIcon />
        </Button>
        <Button variant="ghost" size="icon" onClick={onMenuOpen}>
          <DotsVerticalIcon />
        </Button>
      </div>

      <Menu
        open={Boolean(menuAnchor)}
        id={`erc20-${contract}-menu`}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        {contract && network?.explorer_url && (
          <MenuItem
            component="a"
            target="_blank"
            href={`${network.explorer_url}${contract}`}
            onClick={() => setMenuAnchor(null)}
          >
            Open on explorer
          </MenuItem>
        )}
        <MenuItem onClick={blacklist}>Hide token</MenuItem>
      </Menu>

      <Modal open={transferFormOpen} onClose={() => setTransferFormOpen(false)}>
        <TransferForm
          contract={contract}
          onClose={() => setTransferFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
