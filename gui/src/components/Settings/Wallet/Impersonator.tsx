import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack } from "@mui/material";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import type { Address } from "abitype";

import {
  addressSchema,
  type ImpersonatorWallet,
  type Wallet,
} from "@ethui/types/wallets";
import { Form } from "@ethui/react/components";

// react-hook-form doesn't support value-arrays, only object-arrays, so we need this type as a workaround for the impersonator form
export const schema = z.object({
  name: z.string().min(1),
  addresses: z.array(
    z.object({
      address: addressSchema,
    }),
  ),
  current: z.number().optional(),
});

type Schema = z.infer<typeof schema>;

export interface Props {
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
      <Stack spacing={2} alignItems="flex-start">
        <Form.Text label="Name" name="name" />
        {addressFields.map((field, i) => (
          <Stack alignSelf="stretch" key={field.id} direction="row" spacing={2}>
            <Form.Text
              label="Address"
              name={`addresses.${i}.address`}
              fullWidth
            />
            <Button onClick={() => remove(i)}>Remove</Button>
          </Stack>
        ))}

        <Button color="secondary" onClick={() => append({ address: "" })}>
          Add
        </Button>

        <Stack direction="row" spacing={2}>
          <Form.Submit label="Save" />
          <Button color="warning" variant="contained" onClick={onRemove}>
            Remove
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
