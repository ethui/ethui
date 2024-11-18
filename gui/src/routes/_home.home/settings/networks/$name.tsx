import { createFileRoute } from "@tanstack/react-router";
import { useNetworks } from "#/store/useNetworks";

export const Route = createFileRoute("/_home/home/settings/networks/$name")({
  loader: ({ params }: { params: { name: string } }) =>
    useNetworks.getState().networks.find((n) => n.name === params.name),
});
