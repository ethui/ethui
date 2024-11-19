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

interface Props {
  wallet?: PlaintextWallet;
  onSubmit: (data: Wallet) => Promise<void>;
  onRemove: () => Promise<void>;
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
    <Form form={form} onSubmit={prepareAndSubmit} className="gap-4">
      <Form.Text label="Name" name="name" className="w-full" />
      <Form.Text label="Mnemonic" name="mnemonic" className="w-full" />
      <Form.Text
        label="Derivation Path"
        name="derivationPath"
        className="w-full"
      />
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
