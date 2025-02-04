import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useWalletClient } from "wagmi";
import { z } from "zod";

export const Route = createFileRoute("/wallet/addEthereumChain")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: client } = useWalletClient();
  const schema = z.object({
    chainId: z.number().min(1),
    name: z.string().min(1),
    rpcUrls: z.tuple([
      z.string().url().startsWith("http"),
      z.string().url().startsWith("ws").optional(),
    ]),
    blockExplorerUrls: z.array(z.string().url().optional()),
    nativeCurrency: z.object({
      name: z.string().min(1),
      symbol: z.string().min(1),
      decimals: z.number().min(1),
    }),
  });

  type Schema = z.infer<typeof schema>;

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      chainId: 123,
      name: "fake chain",
      rpcUrls: ["http://not-a-real-url", undefined],
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
    },
  });

  if (!client) return null;

  const onSubmit = (data: Schema) => {
    client.request({
      method: "wallet_addEthereumChain",
      params: [data],
    });
  };

  return (
    <Form form={form} className="flex flex-col gap-2" onSubmit={onSubmit}>
      <h2 className="pb-2 font-bold text-xl">wallet_addEthereumChain</h2>
      <div className="grid w-full grid-cols-2 gap-2">
        <Form.NumberField
          label="chainId"
          name="chainId"
          className="col-span-1"
        />
        <Form.Text label="name" name="name" className="col-span-1" />
      </div>
      <Form.Text label="RPC Url" name="rpcUrls.0" className="w-full" />
      <Form.Text label="WS Url" name="rpcUrls.1" className=" w-full" />
      <Form.Text
        label="Block Explorer"
        name="blockExplorerUrls[0]"
        className="w-full"
      />
      <h3>Currency</h3>
      <div className="grid w-full grid-cols-3 gap-2">
        <Form.Text label="name" name="nativeCurrency.name" className="w-full" />
        <Form.Text
          label="symbol"
          name="nativeCurrency.symbol"
          className="w-full"
        />
        <Form.NumberField
          label="decimals"
          name="nativeCurrency.decimals"
          className="w-full"
        />
      </div>
      <Form.Submit skipDirtyCheck label="Add Chain" />
    </Form>
  );
}
