import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/stacks/_l")({
  beforeLoad: () => ({ breadcrumb: { label: "Stacks", path: null } }),
  component: () => <AnimatedOutlet />,
});
