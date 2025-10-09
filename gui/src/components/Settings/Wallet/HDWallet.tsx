import { passwordFormSchema, passwordSchema } from "@ethui/types/password";
import {
  derivationPathSchema,
  type HdWallet,
  mnemonicSchema,
} from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Address } from "viem";
import { z } from "zod";

const schema = z.object({
  count: z.number().int().min(1).max(100),
  name: z.string().min(1),
  mnemonic: mnemonicSchema,
  derivationPath: derivationPathSchema,
  password: passwordSchema,
});

const createSchema = schema.extend({
  current: z.string(),
});

const updateSchema = schema.pick({
  name: true,
  derivationPath: true,
  count: true,
});

type CreateSchema = z.infer<typeof createSchema>;
type UpdateSchema = z.infer<typeof updateSchema>;

interface Props {
  wallet?: HdWallet;

  onSubmit: (data: CreateSchema | UpdateSchema) => void;
  onRemove: () => void;
}

export function HDWalletForm({ wallet, ...props }: Props) {
  if (!wallet) {
    return <Create {...props} />;
  } else {
    return <Update wallet={wallet} {...props} />;
  }
}

function Create({ onSubmit, onRemove }: Props) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [derivationPath, setDerivationPath] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (!mnemonic || !derivationPath || submitted) return;
    onSubmit({
      count: 5,
      name,
      mnemonic,
      derivationPath,
      password,
    });
    setSubmitted(true);
  }, [name, mnemonic, derivationPath, password, onSubmit, submitted]);

  switch (step) {
    case 0:
      return (
        <MnemonicStep
          onSubmit={(name: string, mnemonic) => {
            setName(name);
            setMnemonic(mnemonic);
            setStep(1);
          }}
          onCancel={onRemove}
        />
      );

    case 1:
      return (
        <PasswordStep
          onSubmit={(p) => {
            setPassword(p);
            setStep(2);
          }}
          onCancel={onRemove}
        />
      );

    case 2:
      return (
        <ReviewStep
          mnemonic={mnemonic}
          onSubmit={(derivationPath) => {
            setDerivationPath(derivationPath);
          }}
          onCancel={onRemove}
        />
      );
  }
}

interface MnemonicStepProps {
  onSubmit: (name: string, mnemonic: string) => void;
  onCancel: () => void;
}

function MnemonicStep({ onSubmit, onCancel }: MnemonicStepProps) {
  const schema = createSchema.pick({ name: true, mnemonic: true });
  type MnemonicFormData = z.infer<typeof schema>;
  const form = useForm<MnemonicFormData>({
    mode: "onChange",
    resolver: zodResolver(schema),
  });
  const onSubmitInternal = (data: MnemonicFormData) => {
    onSubmit(data.name, data.mnemonic);
    form.reset(data);
  };

  return (
    <Form form={form} onSubmit={onSubmitInternal}>
      <Form.Text label="Name" name="name" className="w-full" />

      <Form.Textarea
        label="12-word mnemonic"
        name="mnemonic"
        className="w-full"
      />

      <div className="flex gap-2">
        <Form.Submit label="Continue" />
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}

interface PasswordStepProps {
  onSubmit: (mnemonic: string) => void;
  onCancel: () => void;
}

function PasswordStep({ onSubmit, onCancel }: PasswordStepProps) {
  type PasswordFormData = z.infer<typeof passwordFormSchema>;
  const form = useForm<PasswordFormData>({
    mode: "onChange",
    resolver: zodResolver(passwordFormSchema),
  });

  return (
    <Form form={form} onSubmit={(d: PasswordFormData) => onSubmit(d.password)}>
      <span>Choose a secure password</span>
      <Form.Text type="password" label="Password" name="password" />
      <Form.Text
        type="password"
        label="Password Confirmation"
        name="passwordConfirmation"
      />

      <div className="flex gap-2">
        <Form.Submit label="Continue" />
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}

interface ReviewStepProps {
  mnemonic: string;
  onSubmit: (derivationPath: string) => void;
  onCancel: () => void;
}

function ReviewStep({ mnemonic, onSubmit, onCancel }: ReviewStepProps) {
  const schema = createSchema.pick({ derivationPath: true });
  type DerivationFormData = z.infer<typeof schema>;
  const defaultValues = {
    // TODO: move this default path to a constant, shared with backend
    derivationPath: derivationPathSchema.parse("m/44'/60'/0'/0"),
  };

  const form = useForm<DerivationFormData>({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues,
  });

  const [addresses, setAddresses] = useState<[string, Address][]>([]);

  const onSubmitInternal = (data: DerivationFormData) => {
    onSubmit(data.derivationPath);
  };

  const derivationPath = form.watch("derivationPath");

  useEffect(() => {
    invoke<[string, Address][]>("wallets_get_mnemonic_addresses", {
      mnemonic,
      derivationPath,
    }).then(setAddresses);
  }, [mnemonic, derivationPath]);

  // TODO: form submit disabled is overridden here, but needs to be removed
  // this needs to take into account the "pick" table
  return (
    <Form form={form} onSubmit={onSubmitInternal}>
      <Form.Text label="Derivation Path" name="derivationPath" />

      <div className="flex w-full flex-col space-y-2">
        {addresses.map(([key, address]) => (
          <ul key={key}>
            <li>
              {key} - <strong>{address}</strong>
            </li>
          </ul>
        ))}
      </div>

      <div className="flex gap-2">
        <Form.Submit label="Save" disabled={false} />
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
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
      <Form.Text label="Derivation Path" name="derivationPath" />
      <Form.NumberField label="Address count" name="count" />
      <div className="flex gap-2">
        <Form.Submit label="Save" />
        <Button color="warning" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
