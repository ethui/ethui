import { createFileRoute } from "@tanstack/react-router";
import { type Address, getAddress } from "viem";
import { ContractCallForm } from "#/components/ContractCallForm";

export const Route = createFileRoute("/home/_l/contracts/_l/$chainId/$address")(
  {
    beforeLoad: ({ params }) => ({
      breadcrumb: { type: "address", value: params.address },
    }),
    loader: ({
      params,
    }: {
      params: { chainId: number; address: Address };
    }) => ({
      chainId: Number(params.chainId),
      address: getAddress(params.address),
    }),
    component: () => {
      const { chainId, address } = Route.useLoaderData();

      return <ContractCallForm chainId={chainId} address={address} />;
    },
  },
);
