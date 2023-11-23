import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
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
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import truncateEthAddress from "truncate-eth-address";
import { Address, formatUnits } from "viem";
import { z } from "zod";

import { useProvider } from "@/hooks";
import { derivationPathSchema, PGPWallet } from "@/types/wallets";

export const createSchema = z.object({
  name: z.string().min(1),
  file: z.string().min(1),
  derivationPath: derivationPathSchema,
  count: z.number().int().min(1).max(100),
  current: z.string().optional(),
});

type CreateSchema = z.infer<typeof createSchema>;

const steps = ["Import", "Review"];

interface Props {
  wallet?: PGPWallet;

  onSubmit: (data: CreateSchema) => void;
  onRemove: () => void;
}

export function PGPWalletForm({ wallet, onSubmit, onRemove }: Props) {
  const [step, setStep] = useState(0);

  const [name, setName] = useState<string>("");
  const [file, setFile] = useState<string>("");
  const [derivationPath, setDerivationPath] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!file || !current || !derivationPath || submitted) return;
    onSubmit({
      count: 5,
      file,
      name,
      derivationPath,
      current,
    });
    setSubmitted(true);
  }, [name, current, derivationPath, onSubmit, submitted, file]);

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
        <ImportStep
          onSubmit={async (name: string, file: string) => {
            try {
              const mnemonic = await invoke<string>("wallets_read_pgp_secret", {
                file,
              });

              const isValidMnemonic = await invoke<boolean>(
                "wallets_validate_mnemonic",
                {
                  mnemonic,
                },
              );

              if (isValidMnemonic) {
                setName(name);
                setFile(file);
                setStep(1);
              } else {
                setErrorMsg("Invalid mnemonic");
              }
            } catch (error) {
              setErrorMsg(error as string);
            }
          }}
          onCancel={onRemove}
          errorMsg={errorMsg}
        />
      )}

      {step == 1 && (
        <ReviewStep
          file={file}
          onSubmit={(derivationPath, current) => {
            setDerivationPath(derivationPath);
            setCurrent(current);
          }}
          onCancel={onRemove}
        />
      )}
    </Stack>
  );
}

interface ImportStepProps {
  onSubmit: (name: string, file: string) => Promise<void>;
  onCancel: () => void;
  errorMsg: string;
}

function ImportStep({ onSubmit, onCancel, errorMsg }: ImportStepProps) {
  const schema = createSchema.pick({ name: true, file: true });

  const {
    handleSubmit,
    reset,
    register,
    formState: { errors, isDirty, isValid, isSubmitting },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const onSubmitInternal = async (data: FieldValues) => {
    await onSubmit(data.name, data.file);
    reset(data);
  };

  return (
    <Stack
      spacing={2}
      component="form"
      onSubmit={handleSubmit(onSubmitInternal)}
    >
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        fullWidth
        {...register("name")}
      />
      <TextField
        label="PGP file"
        error={!!errors.file || !!errorMsg}
        helperText={errors.file?.message?.toString()}
        fullWidth
        {...register("file")}
      />
      {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button color="warning" variant="contained" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          {isSubmitting ? (
            <CircularProgress size="1.5rem" thickness={6} />
          ) : (
            "Continue"
          )}
        </Button>
      </Stack>
    </Stack>
  );
}

interface ReviewStepProps {
  file: string;
  onSubmit: (derivationPath: string, key: string) => void;
  onCancel: () => void;
}

function ReviewStep({ file, onSubmit, onCancel }: ReviewStepProps) {
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
    invoke<[string, Address][]>("wallets_get_mnemonic_addresses_from_pgp", {
      file,
      derivationPath,
    }).then(setAddresses);
  }, [file, derivationPath]);

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
