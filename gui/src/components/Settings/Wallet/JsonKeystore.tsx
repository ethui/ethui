import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { JsonKeystoreWallet, Wallet } from "@/types/wallets";

export const schema = z.object({
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
    onSubmit({ type: "jsonKeystore", ...data });
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
