import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback } from "react";
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
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(generalSettingsSchema),
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

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
  console.log(general, errors);

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
                <MenuItem value={"Auto"}>Auto</MenuItem>
                <MenuItem value={"Dark"}>Dark</MenuItem>
                <MenuItem value={"Light"}>Light</MenuItem>
              </Select>
            )}
          />
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
