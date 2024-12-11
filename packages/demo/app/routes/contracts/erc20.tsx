import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contracts/erc20")({
  beforeLoad: () => ({ breadcrumb: "ERC20" }),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/contracts/erc20"!</div>;
}
