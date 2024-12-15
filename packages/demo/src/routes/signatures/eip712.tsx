import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { type FieldValues, useForm } from "react-hook-form";
import { useSignTypedData } from "wagmi";
import { z } from "zod";

export const Route = createFileRoute("/signatures/eip712")({
  component: Eip712,
});

const schema = z.object({
  from: z.object({
    name: z.string().min(1),
    wallet: z.string().min(1),
  }),
  to: z.object({
    name: z.string().min(1),
    wallet: z.string().min(1),
  }),
  contents: z.string().min(1),
});

type Schema = z.infer<typeof schema>;

function Eip712() {
  const { data, signTypedData } = useSignTypedData();

  const form = useForm<Schema>({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: {
      from: {
        name: "Alice",
        wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      },
      to: {
        name: "Alice",
        wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      },
      contents: "Hello World",
    },
  });

  const onSubmit = (data: FieldValues) => {
    signTypedData({ domain, primaryType: "Mail", types, message: data });
  };

  return (
    <>
      <Form form={form} onSubmit={onSubmit} className="flex w-full gap-2">
        <h2>Sign Typed Data</h2>
        <Form.Text label="from (name)" name="from.name" className="w-full" />
        <Form.Text
          label="from (wallet)"
          name="from.wallet"
          className="w-full"
        />
        <Form.Text
          label="to (dwnamewallet)"
          name="to.name"
          className="w-full"
        />
        <Form.Text label="to (wallet)" name="to.wallet" className="w-full" />
        <Form.Text label="contents" name="contents" className="w-full" />
        <Form.Submit label="Sign Typed Data" />
      </Form>
      <p>{data}</p>
    </>
  );
}

// All properties on a domain are optional
const domain = {
  name: "Ether Mail",
  version: "1",
  chainId: 31337,
  verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
} as const;

// The named list of all type definitions
const types = {
  Person: [
    { name: "name", type: "string" },
    { name: "wallet", type: "address" },
  ],
  Mail: [
    { name: "from", type: "Person" },
    { name: "to", type: "Person" },
    { name: "contents", type: "string" },
  ],
} as const;
