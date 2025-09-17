import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/explorer/_l/contracts/_l")({
  beforeLoad: () => ({ breadcrumb: "Contracts" }),
  component: () => <AnimatedOutlet />,
});
