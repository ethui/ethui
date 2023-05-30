import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect } from "react";
import { Controller, FieldValues, useForm } from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { GeneralSettings, generalSettingsSchema } from "../types";

export function SettingsGeneral() {
  const { data: general, mutate } = useInvoke<GeneralSettings>("settings_get");

  const {
    handleSubmit,
    reset,
    formState: { isValid, dirtyFields, errors },
    control,
    register,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: general,
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

  // default values are async, need to reset once they're ready
  useEffect(() => reset(general), [reset, general]);

  const onSubmit = useCallback(
    async (data: FieldValues) => {
      reset(data);
      await invoke("settings_set", {
        newSettings: data,
      });
      mutate();
    },
    [reset, mutate]
  );

  if (!general) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Stack alignItems="flex-start" spacing={2}>
        <FormControl>
          <InputLabel id="darkMode">Dark mode</InputLabel>
          <Controller
            name="darkMode"
            defaultValue={general.darkMode}
            control={control}
            render={({ field }) => (
              <Select
                aria-labelledby="darkMode"
                size="small"
                label="Dark mode"
                sx={{ minWidth: 120 }}
                {...field}
              >
                <MenuItem value={"auto"}>Auto</MenuItem>
                <MenuItem value={"dark"}>Dark</MenuItem>
                <MenuItem value={"light"}>Light</MenuItem>
              </Select>
            )}
          />
        </FormControl>
        <FormControl error={!!errors.abiWatch}>
          <FormGroup>
            <FormControlLabel
              label="ABI Watcher"
              control={
                <Controller
                  name="abiWatch"
                  control={control}
                  render={({ field }) => (
                    <Checkbox {...field} checked={field.value} />
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
          defaultValue={general.abiWatchPath}
          error={!!errors.abiWatchPath}
          helperText={errors.abiWatchPath?.message?.toString() || ""}
          fullWidth
          {...register("abiWatchPath")}
        />
        <FormControl error={!!errors.hideEmptyTokens}>
          <FormGroup>
            <FormControlLabel
              label="Hide Tokens Without Balance"
              control={
                <Controller
                  name="hideEmptyTokens"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      {...field}
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  )}
                />
              }
            />
          </FormGroup>
        </FormControl>
        <TextField
          label="Alchemy API Key"
          {...register("alchemyApiKey")}
          fullWidth
          error={!!errors.alchemyApiKey}
          helperText={errors.alchemyApiKey?.message?.toString()}
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
