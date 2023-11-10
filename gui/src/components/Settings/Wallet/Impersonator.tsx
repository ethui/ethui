import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { addressSchema, ImpersonatorWallet } from "@/types";

// react-hook-form doesn't support value-arrays, only object-arrays, so we need this type as a workaround for the impersonator form
export const schema = z.object({
  type: z.literal("impersonator"),
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
  onSubmit: (data: ImpersonatorWallet) => void;
  onRemove: () => void;
}

export function ImpersonatorForm({ wallet, onSubmit, onRemove }: Props) {
  let formWallet = undefined;
  if (wallet) {
    formWallet = {
      ...wallet,
      addresses: wallet ? wallet.addresses.map((address) => ({ address })) : [],
    };
  }

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: formWallet,
  });

  const prepareAndSubmit = (data: Schema) => {
    onSubmit({
      ...data,
      addresses: data.addresses.map(({ address }) => address),
    });
    reset(data);
  };

  const {
    fields: addressFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "addresses",
  });

  return (
    <Stack
      spacing={2}
      alignItems="flex-start"
      component="form"
      onSubmit={handleSubmit(prepareAndSubmit)}
    >
      <TextField
        label="Name"
        error={!!errors.name}
        helperText={errors.name?.message?.toString()}
        {...register("name")}
      />
      {addressFields.map((field, i) => (
        <Stack alignSelf="stretch" key={field.id} direction="row" spacing={2}>
          <TextField
            label="Address"
            fullWidth
            error={!!errors.addresses && !!errors.addresses[i]}
            helperText={
              errors.addresses && errors.addresses[i]?.address?.message
            }
            {...register(`addresses.${i}.address`)}
          />
          <Button onClick={() => remove(i)}>Remove</Button>
        </Stack>
      ))}
      <Button color="secondary" onClick={() => append({ address: "" })}>
        Add
      </Button>
      <Stack direction="row" spacing={2}>
        <Button
          color="primary"
          variant="contained"
          type="submit"
          disabled={!isDirty || !isValid}
        >
          Save
        </Button>
        <Button color="warning" variant="contained" onClick={onRemove}>
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}
