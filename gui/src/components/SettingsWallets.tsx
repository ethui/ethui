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
import { createElement, useCallback, useEffect, useState } from "react";
import {
  Controller,
  FieldArrayWithId,
  FieldError,
  FieldErrorsImpl,
  FormProvider,
  Merge,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { Wallet, walletTypes, walletsSchema } from "../types";

export function SettingsWallets() {
  const { data: wallets, mutate } =
    useInvoke<(Wallet & NewChild)[]>("wallets_get_all");

  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(walletsSchema),
    defaultValues: { wallets },
  });

  const {
    handleSubmit,
    reset,
    control,
    register,
    formState: { isValid, dirtyFields, errors },
  } = form;

  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

  // default values are async, need to reset once they're ready
  useEffect(() => reset({ wallets }), [reset, wallets]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "wallets",
  });

  const onSubmit = useCallback(
    async (data: { wallets?: Wallet[] }) => {
      reset(data);
      await invoke("wallets_set_list", { list: data.wallets });
      mutate();
    },
    [reset, mutate]
  );

  if (!wallets) return null;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          {fields.map((field, index) => {
            const err = (errors.wallets && errors.wallets[index]) || {};

            return (
              <Accordion key={field.id} defaultExpanded={field.new}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  {field.name}
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    label="Name"
                    error={!!err.name}
                    helperText={err.name?.message?.toString()}
                    {...register(`wallets.${index}.name`)}
                  />

                  <Stack spacing={2} alignItems="flex-start" key={field.id}>
                    {createElement(formPerType[field.type], {
                      index,
                      field,
                      remove,
                      errors: err,
                    })}
                    <Button
                      color="warning"
                      size="small"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mt: 4 }}>
          <Button
            color="primary"
            variant="contained"
            type="submit"
            disabled={!isDirtyAlt || !isValid}
          >
            Save
          </Button>

          <AddWalletButton append={append} />
        </Stack>
      </form>
    </FormProvider>
  );
}

interface AddWalletButtonProps {
  append: UseFieldArrayAppend<
    { wallets: (Wallet & NewChild)[] | undefined },
    "wallets"
  >;
}

const AddWalletButton = ({ append }: AddWalletButtonProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | undefined>();
  const open = Boolean(anchor);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
  };
  const handleClose = () => setAnchor(undefined);

  return (
    <>
      <Button
        id="add-wallet-btn"
        aria-controls={open ? "add-wallet-type-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        variant="contained"
        disableElevation
        onClick={handleClick}
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
        {walletTypes.map((type: Wallet["type"]) => (
          <MenuItem
            value={type}
            key={type}
            sx={{ textTransform: "capitalize" }}
            onClick={() => {
              append(emptyWallets[type]);
              handleClose();
            }}
          >
            {type!.replace(/([A-Z])/g, " $1")}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

type NewChild = { new?: boolean };

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
    path: "",
    new: true,
  },
};

const formPerType: {
  [T in Wallet["type"]]: React.FunctionComponent<SubFormProps>;
} = {
  plaintext: PlaintextWalletForm,
  jsonKeystore: JsonKeystoreWalletForm,
};

interface SubFormProps {
  field: FieldArrayWithId<Wallet>;
  errors: Merge<FieldError, FieldErrorsImpl<NonNullable<Wallet>>>;
  remove: UseFieldArrayRemove;
  index: number;
}

function PlaintextWalletForm({ index, errors }: SubFormProps) {
  const { register, control } = useFormContext<{
    wallets: (Wallet & NewChild)[];
  }>();

  const err = errors as Merge<
    FieldError,
    FieldErrorsImpl<NonNullable<Wallet & { type: "plaintext" }>>
  >;

  return (
    <>
      <input type="hidden" {...register(`wallets.${index}.type`)} />
      <input type="hidden" {...register(`wallets.${index}.currentPath`)} />

      <Stack spacing={2} direction="row">
        <FormControl error={!!err.dev}>
          <FormGroup>
            <FormControlLabel
              label="Dev account"
              control={
                <Controller
                  name={`wallets.${index}.dev`}
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
          {err.dev && (
            <FormHelperText>{err.dev.message?.toString()}</FormHelperText>
          )}
        </FormControl>
      </Stack>
      <TextField
        label="Mnemonic"
        error={!!err.mnemonic}
        helperText={err.mnemonic?.message?.toString() || ""}
        fullWidth
        {...register(`wallets.${index}.mnemonic`)}
      />
      <TextField
        label="Derivation Path"
        spellCheck="false"
        error={!!err.derivationPath}
        helperText={err.derivationPath?.message?.toString() || ""}
        {...register(`wallets.${index}.derivationPath`)}
      />
      <TextField
        label="Count"
        spellCheck="false"
        error={!!err.count}
        type="number"
        helperText={err.count?.message?.toString() || ""}
        {...register(`wallets.${index}.count`, {
          valueAsNumber: true,
        })}
      />
    </>
  );
}

function JsonKeystoreWalletForm({ errors }: SubFormProps) {
  const _err = errors as Merge<
    FieldError,
    FieldErrorsImpl<NonNullable<Wallet & { type: "jsonKeystore" }>>
  >;

  return <></>;
}
