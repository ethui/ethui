import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { FieldValues, useForm } from "react-hook-form";

import { Wallet, walletSchema } from "@/types";

interface JsonKeystoreProps {
  wallet: Wallet & { type: "jsonKeystore" };
  onSubmit: (data: FieldValues) => void;
  onRemove: () => void;
}
export function JsonKeystore({
  wallet,
  onSubmit,
  onRemove,
}: JsonKeystoreProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(walletSchema),
    defaultValues: wallet,
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
      <input type="hidden" {...register("type")} />
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <TextField
        label="Keystore file"
        error={!!errors.file}
        helperText={errors.file?.message?.toString() || ""}
        fullWidth
        {...register("file")}
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
