import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contracts/erc721")({
  beforeLoad: () => ({ breadcrumb: "ERC721" }),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/contracts/erc721"!</div>;
}
