import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import {
  type PlaintextWallet,
  type Wallet,
  derivationPathSchema,
  mnemonicSchema,
} from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";

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
      <Form.Text label="Name" name="name" />
      <Form.Text label="Mnemonic" name="mnemonic" />
      <Form.Text label="Derivation Path" name="derivationPath" />
      <Form.NumberField label="Count" name="count" />

      <div className="flex gap-2">
        <Form.Submit label="Save" />

        <Button variant="destructive" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
