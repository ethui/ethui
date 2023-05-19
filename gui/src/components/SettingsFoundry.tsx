import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback } from "react";
import { Controller, FieldValues, useForm } from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { FoundrySettings, foundrySettingsSchema } from "../types";

export function SettingsFoundry() {
  const { data: foundry, mutate } = useInvoke<FoundrySettings>(
    "foundry_get_settings"
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, dirtyFields, errors },
    control,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(foundrySettingsSchema),
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

  const onSubmit = useCallback(
    async (data: FieldValues) => {
      reset(data);
      await invoke("foundry_set_settings", {
        newSettings: data,
      });
      mutate();
    },
    [reset, mutate]
  );

  if (!foundry) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Stack alignItems="flex-start" spacing={2}>
        <FormControl error={!!errors.watcher}>
          <FormGroup>
            <FormControlLabel
              label="ABI watch"
              control={
                <Controller
                  name="abiWatch"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      {...field}
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  )}
                />
              }
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
          defaultValue={foundry.abiWatchPath}
          error={!!errors.abiWatchPath}
          helperText={errors.abiWatchPath?.message?.toString() || ""}
          fullWidth
          {...register("abiWatchPath")}
        />
        <Grid container style={{ gap: 15 }} alignItems="center">
          <Grid item>
            <Button
              variant="contained"
              type="submit"
              disabled={!isDirtyAlt || !isValid}
            >
              Save
            </Button>
          </Grid>
          <Grid item>
            <Typography>Requires a restart to take effect</Typography>
          </Grid>
        </Grid>
      </Stack>
    </form>
  );
}
