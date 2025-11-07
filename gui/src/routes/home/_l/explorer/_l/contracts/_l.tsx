import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnimatedOutlet } from "#/components/AnimatedOutlet";

export const Route = createFileRoute("/home/_l/explorer/_l/contracts/_l")({
  beforeLoad: () => ({
    breadcrumb: "Contracts",
    breadcrumbActions: (
      <Button variant="outline" asChild size="sm">
        <Link to="/home/explorer/contracts/add">
          <Plus />
          Add Contract
        </Link>
      </Button>
    ),
  }),
  component: () => <AnimatedOutlet />,
});
