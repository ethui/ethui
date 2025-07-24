import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSettings } from "#/store/useSettings";

export function QuickFastModeToggle() {
  const fastMode = useSettings((s) => s.settings?.fastMode || false);

  const schema = z.object({
    fastMode: z.boolean(),
  });

  type FastModeFormData = z.infer<typeof schema>;

  const form = useForm<FastModeFormData>({
    resolver: zodResolver(schema),
    defaultValues: { fastMode },
  });
  const watcher = form.watch("fastMode");

  useEffect(() => {
    invoke("settings_set_fast_mode", { mode: watcher });
  }, [watcher]);

  return (
    <Form form={form} onSubmit={() => {}} className="flex items-center ">
      <Form.Switch name="fastMode" label="Fast Mode" />
    </Form>
  );
}
