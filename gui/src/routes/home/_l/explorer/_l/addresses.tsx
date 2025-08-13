import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/_l/explorer/_l/addresses")({
  beforeLoad: () => ({ breadcrumb: "Addresses" }),
  component: Addresses,
});

function Addresses() {
  return <div>Addresses</div>;
}
