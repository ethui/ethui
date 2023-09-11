import { ExpandMore, KeyboardArrowDown } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { startCase } from "lodash-es";
import { useState } from "react";

import { useWallets } from "../../store";
import { Wallet, walletTypes } from "../../types";
import { HDWalletForm } from "./Wallet/HDWallet";
import { ImpersonatorForm } from "./Wallet/Impersonator";
import { JsonKeystore } from "./Wallet/JsonKeystore";
import { Plaintext } from "./Wallet/Plaintext";

type NewChild = { new?: boolean };

export function SettingsWallets() {
  const wallets = useWallets((s) => s.wallets);
  const [newWallets, setNewWallets] = useState<Wallet[]>([]);

  if (!wallets) return null;

  const allWallets: (Wallet & NewChild)[] = wallets.concat(newWallets);

  const append = (type: Wallet["type"]) => {
    setNewWallets([...newWallets, emptyWallets[type]]);
  };

  const save = async (
    wallet: Wallet & NewChild,
    params: object,
    idx: number,
  ) => {
    if (wallet.new) {
      invoke("wallets_create", { params });
      setNewWallets(newWallets.filter((_, i) => i != idx - wallets.length));
    } else {
      await invoke("wallets_update", { name: wallet.name, params });
    }
  };

  const remove = async (
    wallet: { name: string; new?: boolean },
    idx: number,
  ) => {
    if (wallet.new) {
      setNewWallets(newWallets.filter((_, i) => i != idx - wallets.length));
    } else {
      await invoke("wallets_remove", { name: wallet.name });
    }
  };

  return (
    <>
      <Stack>
        {allWallets.map((wallet, i) => {
          const props = {
            onSubmit: (params: object) => save(wallet, params, i),
            onRemove: () => remove(wallet, i),
            onCancel: () => wallet.new && remove(wallet, i),
          };

          return (
            <Accordion key={wallet.name} defaultExpanded={wallet.new}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack alignItems="center" direction="row">
                  <Typography>
                    {wallet.new ? `New ${startCase(wallet.type)}` : wallet.name}
                  </Typography>
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
                  <HDWalletForm
                    wallet={wallet}
                    type={wallet.new ? "create" : "update"}
                    {...props}
                  />
                )}
                {wallet.type === "impersonator" && (
                  <ImpersonatorForm wallet={wallet} {...props} />
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
      <Stack spacing={2} direction="row" sx={{ mt: 4 }}>
        <AddWalletButton append={append} />
      </Stack>
    </>
  );
}

interface AddWalletButtonProps {
  append: (type: Wallet["type"]) => void;
}

const AddWalletButton = ({ append }: AddWalletButtonProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | undefined>();
  const open = Boolean(anchor);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
  };
  const handleClose = () => setAnchor(undefined);
  const handleChoice = (type: Wallet["type"]) => {
    append(type);
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

const emptyWallets: Record<Wallet["type"], Wallet & NewChild> = {
  plaintext: {
    type: "plaintext",
    name: "",
    dev: false,
    mnemonic: "",
    derivationPath: "",
    count: 1,
    new: true,
  },
  jsonKeystore: {
    type: "jsonKeystore",
    name: "",
    file: "",
    new: true,
  },
  HDWallet: {
    type: "HDWallet",
    name: "",
    count: 5,
    derivationPath: "",
    mnemonic: "",
    password: "",
    new: true,
  },
  impersonator: {
    type: "impersonator",
    name: "",
    addresses: [""],
    new: true,
  },
};
