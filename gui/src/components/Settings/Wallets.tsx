import { ExpandMore, KeyboardArrowDown } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { startCase } from "lodash-es";
import { useState } from "react";
import { type FieldValues } from "react-hook-form";

import { useWallets } from "@/store";
import { Wallet, walletTypes } from "@/types";

import { HDWalletForm } from "./Wallet/HDWallet";
import { ImpersonatorForm } from "./Wallet/Impersonator";
import { JsonKeystore } from "./Wallet/JsonKeystore";
import { Plaintext } from "./Wallet/Plaintext";
import { Panel } from "../Panel";

export function SettingsWallets() {
  const wallets = useWallets((s) => s.wallets);
  const [newType, setNewType] = useState<Wallet["type"] | null>(null);

  if (!wallets) return null;

  const createNew = (type: Wallet["type"]) => {
    setNewType(type);
  };

  const cancelNew = () => {
    setNewType(null);
  };

  return (
    <>
      <Stack>
        {wallets.map((wallet) => (
          <ExistingItem key={wallet.name} wallet={wallet} />
        ))}
        {newType && (
          <NewItem key={`__new`} type={newType} onCancel={cancelNew} />
        )}
      </Stack>
      {!newType && (
        <Stack spacing={2} direction="row" sx={{ mt: 4 }}>
          <AddWalletButton onChoice={createNew} />
        </Stack>
      )}
    </>
  );
}

interface ItemProps {
  wallet: Wallet;
}

function ExistingItem({ wallet }: ItemProps) {
  const save = async (wallet: Wallet, params: object) => {
    await invoke("wallets_update", { name: wallet.name, params });
  };

  const remove = () => {
    invoke("wallets_remove", { name: wallet.name });
  };

  const props = {
    onSubmit: (params: FieldValues) => save(wallet, params),
    onRemove: () => remove(),
    onCancel: () => !wallet && remove(),
  };

  return (
    <Accordion defaultExpanded={!wallet}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Stack alignItems="center" direction="row">
          <Typography>{wallet.name}</Typography>
          <Chip sx={{ marginLeft: 2 }} label={wallet.type} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {wallet.type === "plaintext" && (
          <Plaintext wallet={wallet} {...props} />
        )}
        {wallet.type === "jsonKeystore" && (
          <JsonKeystore wallet={wallet} {...props} />
        )}
        {wallet.type === "HDWallet" && (
          <HDWalletForm wallet={wallet} type="update" {...props} />
        )}
        {wallet.type === "impersonator" && (
          <ImpersonatorForm wallet={wallet} {...props} />
        )}
      </AccordionDetails>
    </Accordion>
  );
}

interface NewItemProps {
  type: Wallet["type"];
  onCancel: () => void;
}

function NewItem({ type, onCancel }: NewItemProps) {
  const save = async (params: object) => {
    await invoke("wallets_create", { params: { ...params, type } });
  };

  const props = {
    onSubmit: (params: FieldValues) => save(params),
    onRemove: onCancel,
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography sx={{ pb: 2 }}>New {type}</Typography>

      {type === "plaintext" && <Plaintext {...props} />}
      {type === "jsonKeystore" && <JsonKeystore {...props} />}
      {type === "HDWallet" && <HDWalletForm type="update" {...props} />}
      {type === "impersonator" && <ImpersonatorForm {...props} />}
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
    <>
      <Button
        id="add-wallet-btn"
        aria-controls={open ? "add-wallet-type-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        variant="contained"
        disableElevation
        onClick={handleOpen}
        endIcon={<KeyboardArrowDown />}
        color="info"
        size="medium"
      >
        Add wallet
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
