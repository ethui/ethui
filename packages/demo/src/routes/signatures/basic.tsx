import { Form } from "@ethui/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { type FieldValues, useForm } from "react-hook-form";
import { useSignMessage } from "wagmi";
import { z } from "zod";

export const Route = createFileRoute("/signatures/basic")({
  component: Basic,
});

const schema = z.object({
  message: z.string().min(1),
});

type Schema = z.infer<typeof schema>;

function Basic() {
  const { data, signMessage } = useSignMessage();

  const form = useForm<Schema>({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  });

  const onSubmit = (data: FieldValues) => {
    signMessage({ message: data.message });
  };

  return (
    <>
      <Form form={form} onSubmit={onSubmit} className="flex w-full gap-2">
        <h2>Sign String</h2>
        <Form.Textarea label="Message" name="message" className="w-full" />
        <Form.Submit label="Sign Message" />
      </Form>
      <p>{data}</p>
    </>
  );
}
