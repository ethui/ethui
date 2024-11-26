import { createFileRoute } from "@tanstack/react-router";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/settings/_l/networks/_l")({
  beforeLoad: () => ({ breadcrumb: "Networks" }),
  component: Networks,
});

function Networks() {
  return <AnimatedOutlet />;
}
