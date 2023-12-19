import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  derivationPathSchema,
  mnemonicSchema,
  PlaintextWallet,
  Wallet,
} from "@iron/types/wallets";

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: wallet,
  });

  const prepareAndSubmit = (data: Schema) => {
    onSubmit({ type: "plaintext", ...data });
    reset(data);
  };

  return (
    <Stack
      spacing={2}
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(prepareAndSubmit)}
    >
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <TextField
        label="Mnemonic"
        error={!!errors.mnemonic}
        helperText={errors.mnemonic?.message?.toString() || ""}
        fullWidth
        {...register("mnemonic")}
      />
      <TextField
        label="Derivation Path"
        spellCheck="false"
        error={!!errors.derivationPath}
        helperText={errors.derivationPath?.message?.toString() || ""}
        {...register("derivationPath")}
      />
      <TextField
        label="Count"
        spellCheck="false"
        error={!!errors.count}
        type="number"
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
