import type { JsonKeystoreWallet, Wallet } from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  file: z.string().min(1),
  currentPath: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

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
  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: wallet,
  });

  const prepareAndSubmit = (data: Schema) => {
    onSubmit({ type: "jsonKeystore", ...data });
    form.reset(data);
  };

  return (
    <Form form={form} onSubmit={prepareAndSubmit} className="gap-4">
      <Form.Text label="Name" name="name" className="w-full" />
      <Form.Text label="Keystore file" name="file" className="w-full" />

      <div className="flex gap-2">
        <Form.Submit label="Save" />
        <Button variant="destructive" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
