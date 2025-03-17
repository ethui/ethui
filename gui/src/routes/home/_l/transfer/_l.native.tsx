import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/_l/transfer/_l/native")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/home/_l/transfer/_l/native"!</div>;
}
