import { zodResolver } from "@hookform/resolvers/zod";
import { ExpandMore, KeyboardArrowDown } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Menu,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { Wallet, walletSchema, walletTypes } from "../types";
import { HDWalletForm } from "./Settings/HDWalletForm";
import { startCase } from "lodash-es";

type NewChild = { new?: boolean };

export function SettingsWallets() {
  const { data: wallets, mutate } = useInvoke<Wallet[]>("wallets_get_all");
  const [newWallets, setNewWallets] = useState<Wallet[]>([]);

  if (!wallets) return null;

  const allWallets: (Wallet & NewChild)[] = wallets.concat(newWallets);

  const append = (type: Wallet["type"]) => {
    setNewWallets([...newWallets, emptyWallets[type]]);
  };

  const save = async (
    wallet: Wallet & NewChild,
    params: Wallet,
    idx: number
  ) => {
    if (wallet.new) {
      invoke("wallets_create", { params }).then(() => mutate());
      setNewWallets(newWallets.filter((_, i) => i != idx - wallets.length));
    } else {
      await invoke("wallets_update", { name: wallet.name, params });
      await mutate();
    }
  };

  const remove = async (wallet: Wallet & NewChild, idx: number) => {
    if (wallet.new) {
      setNewWallets(newWallets.filter((_, i) => i != idx - wallets.length));
    } else {
      await invoke("wallets_remove", { name: wallet.name });
      await mutate();
    }
  };

  return (
    <>
      <Stack>
        {allWallets.map((wallet, i) => {
          const props = {
            onSubmit: (params: Wallet) => save(wallet, params, i),
            onRemove: () => remove(wallet, i),
            onCancel: wallet.new ? () => remove(wallet, i) : () => {},
          };

          return (
            <Accordion key={wallet.name} defaultExpanded={wallet.new}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                {wallet.new ? `New ${startCase(wallet.type)}` : wallet.name}
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

interface PlaintextProps {
  wallet: Wallet & { type: "plaintext" };
  onSubmit: (data: Wallet & { type: "plaintext" }) => void;
  onRemove: () => void;
}

function Plaintext({ wallet, onSubmit, onRemove }: PlaintextProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(walletSchema),
    defaultValues: wallet,
  });

  return (
    <Stack
      spacing={2}
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(onSubmit)}
    >
      <input type="hidden" {...register("type")} />
      <input type="hidden" {...register("currentPath")} />
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <Stack spacing={2} direction="row">
        <FormControl error={!!errors.dev}>
          <FormGroup>
            <FormControlLabel
              label="Dev account"
              control={
                <Controller
                  name="dev"
                  control={control}
                  render={({ field }) => {
                    return (
                      <Checkbox
                        {...field}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    );
                  }}
                />
              }
            />
          </FormGroup>
          {errors.dev && (
            <FormHelperText>{errors.dev.message?.toString()}</FormHelperText>
          )}
        </FormControl>
      </Stack>
      <TextField
        label="Mnemonic"
        error={!!errors.mnemonic}
        helperText={errors.mnemonic?.message?.toString() || ""}
        fullWidth
        {...register("mnemonic")}
      />
      <TextField
        label="Derivation Path"
        spellCheck="false"
        error={!!errors.derivationPath}
        helperText={errors.derivationPath?.message?.toString() || ""}
        {...register("derivationPath")}
      />
      <TextField
        label="Count"
        spellCheck="false"
        error={!!errors.count}
        type="number"
        helperText={errors.count?.message?.toString() || ""}
        {...register("count", { valueAsNumber: true })}
      />
      <Stack direction="row" spacing={2}>
        <Button
          color="primary"
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          Save
        </Button>
        <Button color="warning" variant="contained" onClick={onRemove}>
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}

interface JsonKeystoreProps {
  wallet: Wallet & { type: "jsonKeystore" };
  onSubmit: (data: Wallet & { type: "jsonKeystore" }) => void;
  onRemove: () => void;
}

function JsonKeystore({ wallet, onSubmit, onRemove }: JsonKeystoreProps) {
  const {
    register,
    handleSubmit,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(walletSchema),
    defaultValues: wallet,
  });

  return (
    <Stack
      spacing={2}
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(onSubmit)}
    >
      <input type="hidden" {...register("type")} />
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <TextField
        label="Keystore file"
        error={!!errors.file}
        helperText={errors.file?.message?.toString() || ""}
        fullWidth
        {...register("file")}
      />
      <Stack direction="row" spacing={2}>
        <Button
          color="primary"
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          Save
        </Button>
        <Button color="warning" variant="contained" onClick={onRemove}>
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}

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
  HDWallet: { type: "HDWallet", name: "", new: true },
};
