import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack } from "@mui/material";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import {
  derivationPathSchema,
  mnemonicSchema,
  type PlaintextWallet,
  type Wallet,
} from "@ethui/types/wallets";
import { Form } from "@ethui/react/components";

const schema = z.object({
  name: z.string().min(1),
  mnemonic: mnemonicSchema,
  derivationPath: derivationPathSchema,
  count: z.number().int().min(1),
  currentPath: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

export interface Props {
  wallet?: PlaintextWallet;
  onSubmit: (data: Wallet) => void;
  onRemove: () => void;
}

export function Plaintext({ wallet, onSubmit, onRemove }: Props) {
  const form = useForm<Schema>({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: wallet as Schema,
  });

  const prepareAndSubmit = (data: FieldValues) => {
    onSubmit({ type: "plaintext", ...(data as Schema) });
    form.reset(data);
  };

  return (
    <Form form={form} onSubmit={prepareAndSubmit}>
      <Stack spacing={2} alignItems="flex-start">
        <Form.Text label="Name" name="name" />
        <Form.Text label="Mnemonic" name="mnemonic" fullWidth />
        <Form.Text label="Derivation Path" name="derivationPath" />
        <Form.NumberField label="Count" name="count" />

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
