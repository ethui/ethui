import { passwordFormSchema, passwordSchema } from "@ethui/types/password";
import type { PrivateKeyWallet } from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  password: passwordSchema,
});

const createSchema = schema;

const updateSchema = schema.pick({
  name: true,
});

type CreateSchema = z.infer<typeof createSchema>;
type UpdateSchema = z.infer<typeof updateSchema>;

interface Props {
  wallet?: PrivateKeyWallet;

  onSubmit: (data: CreateSchema | UpdateSchema) => void;
  onRemove: () => void;
}

export function PrivateKeyForm({ wallet, ...props }: Props) {
  if (!wallet) {
    return <Create {...props} />;
  } else {
    return <Update wallet={wallet} {...props} />;
  }
}

function Create({ onSubmit, onRemove }: Props) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [privateKey, setPrivateKey] = useState<string>("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (!privateKey || !password || !name || submitted) return;
    onSubmit({
      name,
      privateKey,
      password,
    });
    setSubmitted(true);
  }, [name, privateKey, password, onSubmit, submitted]);

  return (
    <div className="m-2 flex flex-col flex-col">
      {step === 0 && (
        <PrivateKeyStep
          onSubmit={(name: string, privateKey) => {
            setName(name);
            setPrivateKey(privateKey);
            setStep(1);
          }}
          onCancel={onRemove}
        />
      )}

      {step === 1 && (
        <PasswordStep
          onSubmit={(p) => {
            setPassword(p);
            setStep(2);
          }}
          onCancel={onRemove}
        />
      )}
    </div>
  );
}

interface PrivateKeyStepProps {
  onSubmit: (name: string, privateKey: string) => void;
  onCancel: () => void;
}

function PrivateKeyStep({ onSubmit, onCancel }: PrivateKeyStepProps) {
  const schema = createSchema.pick({ name: true, privateKey: true });
  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const onSubmitInternal = (data: FieldValues) => {
    onSubmit(data.name, data.privateKey);
    form.reset(data);
  };

  return (
    <Form form={form} onSubmit={onSubmitInternal}>
      <Form.Textarea label="Name" name="name" className="w-full" />
      <span>Insert your private key</span>
      <Form.Textarea label="Private Key" name="privateKey" className="w-full" />

      <div className="flex gap-2">
        <Form.Submit label="Continue" />
        <Button variant="destructive" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}

interface PasswordStepProps {
  onSubmit: (privateKey: string) => void;
  onCancel: () => void;
}

function PasswordStep({ onSubmit, onCancel }: PasswordStepProps) {
  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(passwordFormSchema),
  });

  const onSubmitInternal = (data: FieldValues) => {
    onSubmit(data.password);
  };

  return (
    <Form form={form} onSubmit={onSubmitInternal}>
      <div className="m-2 flex flex-col flex-col">
        <span>Choose a secure password</span>
        <Form.Text
          type="password"
          label="Password"
          name="password"
          className="w-full"
        />
        <Form.Text
          type="password"
          label="Password Confirmation"
          name="passwordConfirmation"
          className="w-full"
        />

        <div className="flex gap-2">
          <Form.Submit label="Continue" />
          <Button color="warning" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Form>
  );
}

function Update({ wallet, onSubmit, onRemove }: Props) {
  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(updateSchema),
    defaultValues: wallet,
  });

  return (
    <Form form={form} onSubmit={onSubmit}>
      <Form.Text label="Name" name="name" />
      <div className="flex gap-2">
        <Form.Submit label="Save" />
        <Button color="warning" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
