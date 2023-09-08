import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import truncateEthAddress from "truncate-eth-address";
import { formatUnits } from "viem";
import { z } from "zod";

import { useProvider } from "../../../hooks";
import {
  Address,
  Wallet,
  derivationPathSchema,
  hdWalletSchema,
  passwordFormSchema,
} from "../../../types";

const createSchema = hdWalletSchema.extend({
  current: z.string(),
});

const updateSchema = hdWalletSchema.pick({
  type: true,
  name: true,
  derivationPath: true,
  count: true,
});

type FormType = z.infer<typeof createSchema> | z.infer<typeof updateSchema>;

const steps = ["Import", "Secure", "Review"];

interface Props {
  type: "create" | "update";
  wallet: Wallet & { type: "HDWallet" };

  onSubmit: (data: FormType) => void;
  onCancel: () => void;
  onRemove: () => void;
}

export function HDWalletForm({ type, ...props }: Props) {
  if (type === "create") {
    return <HDWalletCreateForm {...props} />;
  } else {
    return <HDWalletUpdateForm {...props} />;
  }
}

function HDWalletCreateForm({
  wallet,
  onSubmit,
  onCancel,
}: Omit<Props, "type">) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [derivationPath, setDerivationPath] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!current || !mnemonic || !derivationPath) return;
    // TODO
    onSubmit({
      type: wallet.type,
      count: 5,
      name,
      mnemonic,
      derivationPath,
      current,
      password,
    });
  }, [
    name,
    current,
    mnemonic,
    derivationPath,
    password,
    wallet.type,
    onSubmit,
  ]);

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
        <MnemonicStep
          onSubmit={(name: string, mnemonic) => {
            setName(name);
            setMnemonic(mnemonic);
            setStep(1);
          }}
          onCancel={onCancel}
        />
      )}

      {step == 1 && (
        <PasswordStep
          onSubmit={(p) => {
            setPassword(p);
            setStep(2);
          }}
          onCancel={onCancel}
        />
      )}

      {step == 2 && (
        <ReviewStep
          mnemonic={mnemonic}
          onSubmit={(derivationPath, current) => {
            setDerivationPath(derivationPath);
            setCurrent(current);
          }}
          onCancel={onCancel}
        />
      )}
    </Stack>
  );
}

interface MnemonicStepProps {
  onSubmit: (name: string, mnemonic: string) => void;
  onCancel: () => void;
}

function MnemonicStep({ onSubmit, onCancel }: MnemonicStepProps) {
  const schema = createSchema.pick({ name: true, mnemonic: true });
  const {
    handleSubmit,
    register,
    formState: { errors, isDirty, isValid },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });
  const onSubmitInternal = (data: FieldValues) => {
    onSubmit(data.name, data.mnemonic);
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
      <Typography>Insert your 12-word mnemonic</Typography>
      <TextField
        multiline
        label="12-word mnemonic"
        error={!!errors.mnemonic}
        helperText={errors.mnemonic?.message?.toString()}
        {...register("mnemonic")}
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
  onSubmit: (mnemonic: string) => void;
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

interface ReviewStepProps {
  mnemonic: string;
  onSubmit: (derivationPath: string, key: string) => void;
  onCancel: () => void;
}

function ReviewStep({ mnemonic, onSubmit, onCancel }: ReviewStepProps) {
  const schema = createSchema.pick({ derivationPath: true });
  const defaultValues = {
    derivationPath: derivationPathSchema.parse(undefined),
  };

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues,
  });

  const [addresses, setAddresses] = useState<[string, Address][]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  const onSubmitInternal = (data: FieldValues) => {
    if (!current) return;
    onSubmit(data.derivationPath, current);
  };

  const derivationPath = watch("derivationPath");

  useEffect(() => {
    setCurrent(null);
    invoke<[string, Address][]>("wallets_get_mnemonic_addresses", {
      mnemonic,
      derivationPath,
    }).then(setAddresses);
  }, [mnemonic, derivationPath]);

  return (
    <Stack
      spacing={2}
      component="form"
      direction="column"
      onSubmit={handleSubmit(onSubmitInternal)}
    >
      <TextField
        label="Derivation Path"
        error={!!errors.derivationPath}
        helperText={errors.derivationPath?.message?.toString()}
        {...register("derivationPath")}
      />
      {isValid && (
        <Stack direction="column" spacing={2}>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {addresses.map(([key, address]) => (
                  <TableRow
                    hover
                    selected={current == key}
                    sx={{ cursor: "pointer" }}
                    onClick={() => setCurrent(key)}
                    key={key}
                  >
                    <TableCell>{truncateEthAddress(address)}</TableCell>
                    <TableCell align="right">
                      <NativeBalance address={address} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button color="warning" variant="contained" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={!isValid || !current}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

interface NativeBalanceProps {
  address: Address;
}

function NativeBalance({ address }: NativeBalanceProps) {
  const provider = useProvider();
  const symbol = provider?.chain?.nativeCurrency.symbol || "ETH";
  const decimals = provider?.chain?.nativeCurrency.decimals || 18;
  const [balance, setBalance] = useState<string>("");

  useEffect(() => {
    if (!provider) return;
    provider.getBalance({ address }).then((balance: bigint) => {
      if (balance == 0n) return;

      const threshold = BigInt(0.001 * 10 ** decimals);
      if (balance < threshold) {
        setBalance("< 0.001");
      } else {
        const truncatedBalance = balance - (balance % threshold);
        setBalance(formatUnits(truncatedBalance, decimals));
      }
    });
  }, [provider, address, decimals]);

  if (!balance || !provider) return null;

  return (
    <>
      {balance} {symbol}
    </>
  );
}

function HDWalletUpdateForm({
  wallet,
  onSubmit,
  onRemove,
}: Omit<Props, "type">) {
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
      <input type="hidden" {...register("type")} />
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <TextField
        label="Derivation Path"
        spellCheck="false"
        error={!!errors.derivationPath}
        helperText={errors.derivationPath?.message?.toString() || ""}
        {...register("derivationPath")}
      />
      <TextField
        label="Address count"
        spellCheck="false"
        error={!!errors.count}
        helperText={errors.count?.message?.toString() || ""}
        {...register("count", { valueAsNumber: true })}
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
