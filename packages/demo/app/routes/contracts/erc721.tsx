import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contracts/erc721")({
  beforeLoad: () => ({ breadcrumb: "ERC721" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Mint />
      <Owned />
    </>
  );
}

function Mint() {
  return (
    <>
      <h2>Mint</h2>
      <Button disabled={isPending} onClick={onClick}>
        Mint
      </Button>
    </>
  );
}
