import { derivationPathSchema, type LedgerWallet } from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@ethui/ui/components/shadcn/alert";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import type { Address } from "abitype";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useLedgerDetect } from "#/hooks/useLedgerDetect";

const schema = z.object({
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

interface Props {
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

  useEffect(() => {
    (async () => {
      const newPaths = paths
        .filter(({ path }) => path && !addresses.has(path))
        .map(({ path }) => path);

      if (newPaths.length === 0) return;

      const addrs = await invoke<[string, Address][]>("wallets_ledger_derive", {
        paths: newPaths,
      });

      if (!addrs) return;

      for (const [path, address] of addrs) {
        addresses.set(path, address);
      }

      setAddresses(new Map(addresses));
    })();
  }, [paths, addresses]);

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
      <Detect />
      <Form.Text label="Name" name="name" className="w-full" />

      {pathsFields.map((field, i) => {
        // TODO: this was in a helper text in mui. how to add it with shadcn?
        // const path = form.watch(`paths.${i}.path`);
        // const address = addresses.get(path);
        return (
          <div className="flex flex-col self-stretch" key={field.id}>
            <div className="flex items-center self-stretch">
              <Form.Text
                label={`Path #${i + 1}`}
                name={`paths.${i}.path`}
                className="w-full"
              />

              <Button variant="ghost" onClick={() => remove(i)}>
                Remove
              </Button>
            </div>
          </div>
        );
      })}
      <Button variant="outline" onClick={() => append({ path: "" })}>
        Add
      </Button>
      <div className="flex gap-2">
        <Form.Submit label="Save" />
        <Button variant="destructive" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}

function Detect() {
  const detected = useLedgerDetect({});

  if (detected === true) {
    return (
      <Alert variant="success">
        <AlertTitle>Ledger detected</AlertTitle>
        <AlertDescription>
          Please keep the Ethereum app open during this setup
        </AlertDescription>
      </Alert>
    );
  } else if (detected === false) {
    return (
      <Alert variant="destructive" className="">
        <AlertTitle>Failed to detect your ledger</AlertTitle>
        <AlertDescription>
          Please unlock your Ledger, and open the Ethereum app
        </AlertDescription>
      </Alert>
    );
  } else {
    return (
      <Alert variant="destructive">
        <AlertTitle>Ledger not detected</AlertTitle>
        <AlertDescription>
          Please unlock your Ledger, and open the Ethereum app
        </AlertDescription>
      </Alert>
    );
  }
}
