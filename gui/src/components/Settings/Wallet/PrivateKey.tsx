import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { passwordFormSchema, passwordSchema } from "@ethui/types/password";
import { PrivateKeyWallet } from "@ethui/types/wallets";

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
      {step == 0 && (
        <PrivateKeyStep
          onSubmit={(name: string, privateKey) => {
            setName(name);
            setPrivateKey(privateKey);
            setStep(1);
          }}
          onCancel={onRemove}
        />
      )}

      {step == 1 && (
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
  const {
    handleSubmit,
    reset,
    register,
    formState: { errors, isDirty, isValid },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });
  const onSubmitInternal = (data: FieldValues) => {
    onSubmit(data.name, data.privateKey);
    reset(data);
  };

  return (
    <Stack
      direction="column"
      spacing={2}
      component="form"
      onSubmit={handleSubmit(onSubmitInternal)}
    >
      <TextField
        multiline
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <Typography>Insert your 12-word privateKey</Typography>
      <TextField
        multiline
        label="privateKey"
        error={!!errors.privateKey}
        helperText={errors.privateKey?.message?.toString()}
        {...register("privateKey")}
      />

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button color="warning" variant="contained" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          Continue
        </Button>
      </Stack>
    </Stack>
  );
}

interface PasswordStepProps {
  onSubmit: (privateKey: string) => void;
  onCancel: () => void;
}

function PasswordStep({ onSubmit, onCancel }: PasswordStepProps) {
  const {
    handleSubmit,
    register,
    formState: { errors, isDirty, isValid },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(passwordFormSchema),
  });
  const onSubmitInternal = (data: FieldValues) => {
    onSubmit(data.password);
  };

  return (
    <Stack
      direction="column"
      spacing={2}
      component="form"
      onSubmit={handleSubmit(onSubmitInternal)}
    >
      <Typography>Choose a secure password</Typography>
      <TextField
        type="password"
        label="Password"
        error={!!errors.password}
        helperText={errors.password?.message?.toString()}
        {...register("password")}
      />
      <TextField
        type="password"
        label="Password Confirmation"
        error={!!errors.passwordConfirmation}
        helperText={errors.passwordConfirmation?.message?.toString()}
        {...register("passwordConfirmation")}
      />

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button color="warning" variant="contained" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          Continue
        </Button>
      </Stack>
    </Stack>
  );
}

function Update({ wallet, onSubmit, onRemove }: Props) {
  const {
    register,
    handleSubmit,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(updateSchema),
    defaultValues: wallet,
  });

  return (
    <Stack
      spacing={2}
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(onSubmit)}
    >
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <Stack direction="row" spacing={2}>
        <Button
          color="primary"
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          Save
        </Button>
        <Button color="warning" variant="contained" onClick={onRemove}>
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}
