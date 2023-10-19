import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { useSettings } from "@/store";

export const schema = z.object({
  abiWatchPath: z.string().optional().nullable(),
});

export function SettingsFoundry() {
  const values = useSettings((s) => s.settings);

  const {
    handleSubmit,
    reset,
    formState: { isValid, errors },
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: values,
  });

  // default values are async, need to reset once they're ready
  useEffect(() => reset(values), [reset, values]);

  const onSubmit = useCallback(
    async (params: FieldValues) => {
      await invoke("settings_set", {
        params,
      });
      reset(params);
    },
    [reset],
  );

  if (!values) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>
          Iron can monitor your filesystem for foundry projects, indexing the
          output ABIs automatically.
        </Typography>

        <TextField
          label="ABI Watch path"
          defaultValue={values.abiWatchPath}
          error={!!errors.abiWatchPath}
          helperText={errors.abiWatchPath?.message?.toString() || ""}
          fullWidth
          {...register("abiWatchPath")}
        />
        <Button variant="contained" type="submit" disabled={!isValid}>
          Save
        </Button>
      </Stack>
    </form>
  );
}
