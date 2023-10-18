import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect } from "react";
import { Controller, FieldValues, useForm } from "react-hook-form";

import { useSettings } from "@/store";
import { generalSettingsSchema } from "@/types";

export function SettingsGeneral() {
  const general = useSettings((s) => s.settings);

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
      console.log("here");
      await invoke("settings_set", {
        newSettings: data,
      });
      console.log("here2");
      reset(data);
    },
    [reset],
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

        <FormControl error={!!errors.fastMode}>
          <FormGroup>
            <Controller
              name="fastMode"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  sx={{ pointerEvents: "auto" }}
                  label="Fast mode"
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
        <TextField
          label="Alchemy API Key"
          {...register("alchemyApiKey")}
          fullWidth
          error={!!errors.alchemyApiKey}
          helperText={errors.alchemyApiKey?.message?.toString()}
        />
        <TextField
          label="Etherscan API Key"
          {...register("etherscanApiKey")}
          fullWidth
          error={!!errors.etherscanApiKey}
          helperText={errors.etherscanApiKey?.message?.toString()}
        />
        <FormControl error={!!errors.hideEmptyTokens}>
          <FormGroup>
            <Controller
              name="hideEmptyTokens"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  label="Hide Tokens Without Balance"
                  control={<Switch {...field} checked={field.value} />}
                />
              )}
            />
          </FormGroup>
          {errors.abiWatch && (
            <FormHelperText>
              {errors.hideEmptyTokens?.message?.toString()}
            </FormHelperText>
          )}
        </FormControl>
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
