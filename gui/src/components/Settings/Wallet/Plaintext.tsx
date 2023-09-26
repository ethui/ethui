import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Stack,
  TextField,
} from "@mui/material";
import { Controller, FieldValues, useForm } from "react-hook-form";

import { Wallet, walletSchema } from "../../../types";

export interface Props {
  wallet: Wallet & { type: "plaintext" };
  onSubmit: (data: FieldValues) => void;
  onRemove: () => void;
}

export function Plaintext({ wallet, onSubmit, onRemove }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
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
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      <Stack spacing={2} direction="row">
        <FormControl error={!!errors.dev}>
          <FormGroup>
            <FormControlLabel
              label="Dev account"
              control={
                <Controller
                  name="dev"
                  control={control}
                  render={({ field }) => {
                    return (
                      <Checkbox
                        {...field}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    );
                  }}
                />
              }
            />
          </FormGroup>
          {errors.dev && (
            <FormHelperText>{errors.dev.message?.toString()}</FormHelperText>
          )}
        </FormControl>
      </Stack>
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
