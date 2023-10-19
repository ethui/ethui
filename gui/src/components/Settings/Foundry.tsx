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
  const general = useSettings((s) => s.settings);

  const {
    handleSubmit,
    reset,
    formState: { isValid, dirtyFields, errors },
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: general,
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const disabled = !Object.keys(dirtyFields).length || !isValid;

  // default values are async, need to reset once they're ready
  useEffect(() => reset(general), [reset, general]);

  const onSubmit = useCallback(
    async (params: FieldValues) => {
      await invoke("settings_set", {
        params,
      });
      reset(params);
    },
    [reset],
  );

  if (!general) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>
          Iron can monitor your filesystem for foundry projects, indexing the
          output ABIs automatically.
        </Typography>

        <TextField
          label="ABI Watch path"
          defaultValue={general.abiWatchPath}
          error={!!errors.abiWatchPath}
          helperText={errors.abiWatchPath?.message?.toString() || ""}
          fullWidth
          {...register("abiWatchPath")}
        />
        <Button variant="contained" type="submit" disabled={disabled}>
          Save
        </Button>
      </Stack>
    </form>
  );
}
