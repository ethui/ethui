import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/transfer/_l")({
  beforeLoad: () => ({ breadcrumb: { label: "Transfer", path: null } }),
  component: () => <AnimatedOutlet />,
});
