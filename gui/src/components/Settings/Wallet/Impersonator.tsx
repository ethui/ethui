import { zodResolver } from "@hookform/resolvers/zod";
import type { Address } from "abitype";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  type ImpersonatorWallet,
  type Wallet,
  addressSchema,
} from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";

// react-hook-form doesn't support value-arrays, only object-arrays, so we need this type as a workaround for the impersonator form
const schema = z.object({
  name: z.string().min(1),
  addresses: z.array(
    z.object({
      address: addressSchema,
    }),
  ),
  current: z.number().optional(),
});

type Schema = z.infer<typeof schema>;

interface Props {
  wallet?: ImpersonatorWallet;
  onSubmit: (data: Wallet) => void;
  onRemove: () => void;
}

export function ImpersonatorForm({ wallet, onSubmit, onRemove }: Props) {
  const formWallet = wallet
    ? {
      ...wallet,
      addresses: wallet
        ? wallet.addresses.map((address) => ({ address }))
        : [],
    }
    : undefined;

  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: formWallet,
  });

  const prepareAndSubmit = (data: Schema) => {
    onSubmit({
      ...data,
      type: "impersonator",
      addresses: data.addresses.map(({ address }) => address as Address),
    });
    form.reset(data);
  };

  const {
    fields: addressFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  return (
    <Form form={form} onSubmit={prepareAndSubmit}>
      <Form.Text label="Name" name="name" />
      {addressFields.map((field, i) => (
        <div className=" m-2 flex self-stretch" key={field.id}>
          <Form.Text label="Address" name={`addresses.${i}.address`} />
          <Button onClick={() => remove(i)}>Remove</Button>
        </div>
      ))}

      <Button color="secondary" onClick={() => append({ address: "" })}>
        Add
      </Button>

      <div className=" m-2 flex">
        <Form.Submit label="Save" />
        <Button color="warning" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </Form>
  );
}
