import { Chip, Menu, MenuItem, Paper } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { startCase } from "lodash-es";
import { useState } from "react";

import { type Wallet, walletTypes } from "@ethui/types/wallets";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { Button } from "@ethui/ui/components/shadcn/button";
import { CaretDownIcon } from "@radix-ui//react-icons";
import { useWallets } from "#/store/useWallets";
import { HDWalletForm } from "./Wallet/HDWallet";
import { ImpersonatorForm } from "./Wallet/Impersonator";
import { JsonKeystore } from "./Wallet/JsonKeystore";
import { Ledger } from "./Wallet/Ledger";
import { Plaintext } from "./Wallet/Plaintext";
import { PrivateKeyForm } from "./Wallet/PrivateKey";

interface Props {
  extraAction?: React.ReactNode;
}

export function SettingsWallets({ extraAction }: Props) {
  const wallets = useWallets((s) => s.wallets);
  const [newType, setNewType] = useState<Wallet["type"] | null>(null);

  if (!wallets) return null;

  const startNew = (type: Wallet["type"]) => {
    setNewType(type);
  };

  const closeNew = () => setNewType(null);

  return (
    <>
      <div className="flex flex-col">
        <Accordion type="single" collapsible className="w-full">
          {wallets.map((wallet) => (
            <ExistingItem key={wallet.name} wallet={wallet} />
          ))}
        </Accordion>
        {newType && <NewItem key="_new" type={newType} onFinish={closeNew} />}
      </div>
      {!newType && (
        <div className="m-2 mt-4 flex justify-between justify-between">
          <AddWalletButton onChoice={startNew} />
          {extraAction && extraAction}
        </div>
      )}
    </>
  );
}

interface ItemProps {
  wallet: Wallet;
}

function ExistingItem({ wallet }: ItemProps) {
  const props = {
    onSubmit: (params: object) =>
      invoke("wallets_update", { name: wallet.name, params }),
    onRemove: () => invoke("wallets_remove", { name: wallet.name }),
  };

  return (
    <AccordionItem value={wallet.name}>
      <AccordionTrigger>
        <div className=" flex items-center">
          <span>{wallet.name}</span>
          <Chip sx={{ marginLeft: 2 }} label={wallet.type} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {wallet.type === "plaintext" && (
          <Plaintext wallet={wallet} {...props} />
        )}
        {wallet.type === "jsonKeystore" && (
          <JsonKeystore wallet={wallet} {...props} />
        )}
        {wallet.type === "HDWallet" && (
          <HDWalletForm wallet={wallet} {...props} />
        )}
        {wallet.type === "impersonator" && (
          <ImpersonatorForm wallet={wallet} {...props} />
        )}
        {wallet.type === "privateKey" && (
          <PrivateKeyForm wallet={wallet} {...props} />
        )}
        {wallet.type === "ledger" && <Ledger wallet={wallet} {...props} />}
      </AccordionContent>
    </AccordionItem>
  );
}

interface NewItemProps {
  type: Wallet["type"];
  onFinish: () => void;
}

function NewItem({ type, onFinish }: NewItemProps) {
  const save = async (params: object) => {
    await invoke("wallets_create", { params: { ...params, type } });
  };

  const props = {
    onSubmit: (params: object) => {
      save(params);
      onFinish();
    },
    onRemove: onFinish,
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <span className="pb-2">New {type}</span>

      {type === "plaintext" && <Plaintext {...props} />}
      {type === "jsonKeystore" && <JsonKeystore {...props} />}
      {type === "HDWallet" && <HDWalletForm {...props} />}
      {type === "impersonator" && <ImpersonatorForm {...props} />}
      {type === "ledger" && <Ledger {...props} />}
      {type === "privateKey" && <PrivateKeyForm {...props} />}
    </Paper>
  );
}

interface AddWalletButtonProps {
  onChoice: (type: Wallet["type"]) => void;
}

const AddWalletButton = ({ onChoice }: AddWalletButtonProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | undefined>();
  const open = Boolean(anchor);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
  };
  const handleClose = () => setAnchor(undefined);
  const handleChoice = (type: Wallet["type"]) => {
    onChoice(type);
    setAnchor(undefined);
  };

  return (
    // TODO: make this button into a dropdown
    <>
      <Button id="add-wallet-btn" onClick={handleOpen}>
        <CaretDownIcon />
        Add
      </Button>
      <Menu
        id="add-wallet-type-menu"
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
      >
        {walletTypes.map((walletType: Wallet["type"]) => (
          <MenuItem
            value={walletType}
            key={walletType}
            sx={{ textTransform: "capitalize" }}
            onClick={() => handleChoice(walletType)}
          >
            {startCase(walletType)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
