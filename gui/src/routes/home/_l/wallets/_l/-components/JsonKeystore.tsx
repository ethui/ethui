import type { JsonKeystoreWallet, Wallet } from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  file: z.string().min(1),
  password: z.string().min(1),
});

const updateSchema = createSchema.pick({ name: true });

interface JsonKeystoreProps {
  wallet?: JsonKeystoreWallet;
  onSubmit: (data: Wallet) => void;
  onRemove: () => void;
}

export function JsonKeystore({
  wallet,
  onSubmit,
  onRemove,
}: JsonKeystoreProps) {
  const schema = wallet ? updateSchema : createSchema;
  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: wallet,
  });

  const prepareAndSubmit = (data: z.infer<typeof schema>) => {
    onSubmit({ type: "jsonKeystore", ...data } as Wallet);
    form.reset(data);
  };

  return (
    <Form form={form} onSubmit={prepareAndSubmit} className="gap-4">
      <Form.Text label="Name" name="name" className="w-full" />
      {!wallet && (
        <>
          <Form.Text label="Keystore file" name="file" className="w-full" />
          <Form.Text
            type="password"
            label="Keystore password"
            name="password"
            className="w-full"
          />
        </>
      )}

      <div className="flex gap-2">
        <Form.Submit label="Save" />
        <Button variant="destructive" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
