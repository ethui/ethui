import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect } from "react";
import { Controller, FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { useSettings } from "@/store";

export const schema = z.object({
  abiWatch: z.boolean(),
  abiWatchPath: z.string().optional().nullable(),
});

export function SettingsFoundry() {
  const general = useSettings((s) => s.settings);

  const {
    handleSubmit,
    reset,
    formState: { isValid, dirtyFields, errors },
    control,
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: general,
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

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
        <FormControl error={!!errors.abiWatch}>
          <FormGroup>
            <Controller
              name="abiWatch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  label="ABI Watcher"
                  control={<Switch {...field} checked={field.value} />}
                />
              )}
            />
          </FormGroup>
          {errors.abiWatch && (
            <FormHelperText>
              {errors.abiWatch.message?.toString()}
            </FormHelperText>
          )}
        </FormControl>

        <TextField
          label="ABI Watch path"
          defaultValue={general.abiWatchPath}
          error={!!errors.abiWatchPath}
          helperText={errors.abiWatchPath?.message?.toString() || ""}
          fullWidth
          {...register("abiWatchPath")}
        />
        <Button
          variant="contained"
          type="submit"
          disabled={!isDirtyAlt || !isValid}
        >
          Save
        </Button>
      </Stack>
    </form>
  );
}
