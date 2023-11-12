import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertTitle, Button, Stack, TextField } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { Address } from "abitype";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { derivationPathSchema, LedgerWallet } from "@/types/wallets";

export const schema = z.object({
  name: z.string().min(1),
  paths: z.array(
    z.object({
      path: derivationPathSchema,
    }),
  ),
});

type Schema = z.infer<typeof schema>;

const defaultValues: Schema = {
  name: "",
  paths: [{ path: "m/44'/60'/0'/0/0" }],
};

export interface Props {
  wallet?: LedgerWallet;
  onSubmit: (data: object) => void;
  onRemove: () => void;
}

export function Ledger({ wallet, onSubmit, onRemove }: Props) {
  let formWallet;
  if (wallet) {
    formWallet = {
      ...wallet,
      paths: wallet ? wallet.addresses.map(([path]) => ({ path })) : [],
    };
  } else {
    formWallet = defaultValues;
  }

  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: formWallet,
  });

  const prepareAndSubmit = (data: Schema) => {
    onSubmit({
      ...data,
      type: "ledger",
      paths: data.paths.map(({ path }) => path),
    });
    reset(data);
  };

  const paths = watch("paths");
  const pathsStr = paths.map(({ path }) => path).join("");

  useEffect(() => {
    (async () => {
      const newPaths = paths
        .filter(({ path }) => !addresses.has(path))
        .map(({ path }) => path);

      if (newPaths.length == 0) return;

      const addrs = await invoke<[string, Address][]>("wallets_ledger_derive", {
        paths: newPaths,
      });

      if (!addrs) return;

      addrs.forEach(([path, address]) => {
        addresses.set(path, address);
      });

      setAddresses(new Map(addresses));
    })();
  }, [paths, pathsStr, addresses, setAddresses]);

  const {
    fields: pathsFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "paths",
  });

  return (
    <Stack
      spacing={2}
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(prepareAndSubmit)}
    >
      <Detect />
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      {pathsFields.map((field, i) => {
        const error = errors.paths && errors.paths[i]?.path?.message;
        const path = watch(`paths.${i}.path`);
        const address = addresses.get(path);
        return (
          <Stack alignSelf="stretch" key={field.id}>
            <Stack alignSelf="stretch" direction="row" spacing={2}>
              <TextField
                label={`Path #${i + 1}`}
                fullWidth
                error={!!error}
                helperText={error || address}
                {...register(`paths.${i}.path`)}
              />
              <Button onClick={() => remove(i)}>Remove</Button>
            </Stack>
          </Stack>
        );
      })}
      <Button color="secondary" onClick={() => append({ path: "" })}>
        Add
      </Button>
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

const ledgerSkippableError =
  "ledger error: hidapi error: hid_error is not implemented yet";

function Detect() {
  const [detected, setDetect] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () =>
        invoke("wallets_ledger_derive", { paths: ["m/44'/60'/0'/0/0"] })
          .then(() => setDetect(Math.max(1, detected + 1)))
          .catch((err) => {
            if (detected && err === ledgerSkippableError) {
              console.warn("skipping ledger error:", err);
              return;
            }
            console.warn(err);
            setDetect(Math.min(-1, detected - 1));
          }),
      1000,
    );

    return () => clearInterval(interval);
  }, [detected]);

  if (detected > 0) {
    return (
      <Alert severity="success">
        <AlertTitle>Ledger detected</AlertTitle>
        Please keep the Ethereum app open during this setup
      </Alert>
    );
  } else if (detected <= -3) {
    return (
      <Alert severity="warning">
        <AlertTitle>Failed to detect your ledger</AlertTitle>
        Please unlock your Ledger, and open the Ethereum app
      </Alert>
    );
  } else {
    return (
      <Alert severity="info">
        <AlertTitle>Ledger not detected</AlertTitle>
        Please unlock your Ledger, and open the Ethereum app
      </Alert>
    );
  }
}
