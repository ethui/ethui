import { AnimatedOutlet } from "#/components/AnimatedOutlet";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/_l/transfer/_l")({
  beforeLoad: () => ({ breadcrumb: "Transfer" }),
  component: () => <AnimatedOutlet />,
});
