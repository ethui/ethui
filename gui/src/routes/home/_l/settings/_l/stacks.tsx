import { useSettings } from "#/store/useSettings";

export const Route = createFileRoute("/home/_l/settings/_l/stacks")({
  beforeLoad: () => ({ breadcrumb: "General" }),
  component: () => <SettingsStacks />,
});

function SettingsStacks() {
  const { stacksJwt } = useSettings();
  const form = useForm({ mode: "onChange" });
  return <Form form={form}></Form>;
}
