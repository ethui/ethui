import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { derivationPathSchema, LedgerWallet } from "@/types/wallets";

export const createSchema = z.object({
  name: z.string().min(1),
  derivationPath: derivationPathSchema,
  count: z.number().int().min(1).max(100),
});

export interface Props {
  wallet?: LedgerWallet;
  onSubmit: (data: object) => void;
  onRemove: () => void;
}

export function Ledger({ wallet, ...props }: Props) {
  if (!wallet) {
    return <Create {...props} />;
  } else {
    return <Update wallet={wallet} {...props} />;
  }
}

export function Create({ onSubmit, onRemove }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(createSchema),
  });

  const prepareAndSubmit = (data: FieldValues) => {
    onSubmit(data);
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
function Update({}: Omit<Props, "type">) {
  return <>TODO</>;
}
