import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { passwordFormSchema, passwordSchema } from "@ethui/types/password";
import type { PrivateKeyWallet } from "@ethui/types/wallets";
import { Form } from "@ethui/react/components";

export const schema = z.object({
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

const steps = ["Import", "Secure"];

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
    <Stack direction="column" spacing={2}>
      <Stepper activeStep={step} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
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
    </Stack>
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
      <Stack direction="column" spacing={2}>
        <Form.Text multiline label="Name" name="name" />
        <Typography>Insert your 12-word privateKey</Typography>
        <Form.Text multiline label="Private Key" name="privateKey" />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button color="warning" variant="contained" onClick={onCancel}>
            Cancel
          </Button>

          <Form.Submit label="Continue" />
        </Stack>
      </Stack>
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
      <Stack direction="column" spacing={2}>
        <Typography>Choose a secure password</Typography>
        <Form.Text type="password" label="Password" name="password" />
        <Form.Text
          type="password"
          label="Password Confirmation"
          name="passwordConfirmation"
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button color="warning" variant="contained" onClick={onCancel}>
            Cancel
          </Button>

          <Form.Submit label="Continue" />
        </Stack>
      </Stack>
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
      <Stack spacing={2} alignItems="flex-start">
        <Form.Text label="Name" name="name" />
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
