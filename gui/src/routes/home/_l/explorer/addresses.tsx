import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/_l/explorer/addresses")({
  component: Addresses,
});

function Addresses() {
  return <div>Addresses</div>;
}
