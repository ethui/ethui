import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertTitle, Button, Stack, TextField } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { Address } from "abitype";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { derivationPathSchema, LedgerWallet } from "@ethui/types/wallets";
import { Form } from "@ethui/react/components";
import { useLedgerDetect } from "@/hooks";

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
  const formWallet = wallet
    ? {
        ...wallet,
        paths: wallet ? wallet.addresses.map(([path]) => ({ path })) : [],
      }
    : defaultValues;

  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());

  const form = useForm({
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
    form.reset(data);
  };

  const paths = useWatch({ control: form.control, name: "paths" });
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
    control: form.control,
    name: "paths",
  });

  return (
    <Form form={form} onSubmit={prepareAndSubmit}>
      <Stack spacing={2} alignItems="flex-start">
        <Detect />
        <Form.Text label="Name" name="name" />

        {pathsFields.map((field, i) => {
          const path = form.watch(`paths.${i}.path`);
          const address = addresses.get(path);
          return (
            <Stack alignSelf="stretch" key={field.id}>
              <Stack alignSelf="stretch" direction="row" spacing={2}>
                <Form.Text
                  label={`Path #${i + 1}`}
                  name={`paths.${i}.path`}
                  helperText={address}
                  fullWidth
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
          <Form.Submit label="Save" />
          <Button color="warning" variant="contained" onClick={onRemove}>
            Remove
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}

function Detect() {
  const detected = useLedgerDetect({});

  if (detected === true) {
    return (
      <Alert severity="success">
        <AlertTitle>Ledger detected</AlertTitle>
        Please keep the Ethereum app open during this setup
      </Alert>
    );
  } else if (detected == false) {
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
