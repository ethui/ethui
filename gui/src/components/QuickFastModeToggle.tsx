import { Label } from "@ethui/ui/components/shadcn/label";
import { Switch } from "@ethui/ui/components/shadcn/switch";
import { invoke } from "@tauri-apps/api/core";

import { useSettings } from "#/store/useSettings";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@ethui/ui/components/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";

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
    <Form form={form} onSubmit={() => { }} className="flex items-center ">
      <Form.Checkbox name="fastMode" label="Fast Mode" />
    </Form>
  );
}
