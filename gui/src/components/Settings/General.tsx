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
import { z } from "zod";

import { useSettings } from "@/store";

export const schema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  alchemyApiKey: z
    .string()
    .optional()
    .nullable()
    .superRefine(async (key, ctx) => {
      if (!key) return;
      const valid = await invoke("settings_test_alchemy_api_key", { key });
      if (valid) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid key",
      });
    }),
  etherscanApiKey: z
    .string()
    .optional()
    .nullable()

    .superRefine(async (key, ctx) => {
      if (!key) return;
      const valid = await invoke("settings_test_etherscan_api_key", { key });
      if (valid) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid key",
      });
    }),
  hideEmptyTokens: z.boolean(),
  onboarded: z.boolean(),
  fastMode: z.boolean(),
});

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
    resolver: zodResolver(schema),
    defaultValues: general,
  });
  // https://github.com/react-hook-form/react-hook-form/issues/3213
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
