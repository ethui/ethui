import { invoke } from "@tauri-apps/api/core";

import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";

export function QuickFastModeToggle() {
  const fastMode = useSettings((s) => s.settings?.fastMode);

  const schema = z.object({
    fastMode: z.boolean(),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fastMode },
  });
  const watcher = form.watch("fastMode");

  useEffect(() => {
    invoke("settings_set_fast_mode", { mode: watcher });
  }, [watcher]);

  return (
    <Form form={form} onSubmit={() => {}} className="flex items-center ">
      <Form.Checkbox name="fastMode" label="Fast Mode" />
    </Form>
  );
}
