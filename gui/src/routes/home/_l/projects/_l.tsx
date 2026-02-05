import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/projects/_l")({
  beforeLoad: () => ({
    breadcrumb: "Projects",
  }),
  component: () => <AnimatedOutlet />,
});
