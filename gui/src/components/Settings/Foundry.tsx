import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useCallback } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { Form } from "@ethui/react/components";
import { useSettings } from "@/store";

export const schema = z.object({
  abiWatchPath: z.string().optional().nullable(),
});

export function SettingsFoundry() {
  const general = useSettings((s) => s.settings);

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: general,
  });

  const onSubmit = useCallback(
    async (params: FieldValues) => {
      await invoke("settings_set", {
        params,
      });
      form.reset(params);
    },
    [form],
  );

  if (!general) return null;

  return (
    <Form form={form} onSubmit={onSubmit} className="flex flex-col gap-4">
      <Stack alignItems="flex-start" spacing={2}>
        <Typography>
          ethui can monitor your filesystem for foundry projects, indexing the
          output ABIs automatically.
        </Typography>

        <Form.Text name="abiWatchPath" label="ABI Watch path" fullWidth />
        <Form.Submit label="Save" />
      </Stack>
    </Form>
  );
}
