import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { derivationPathSchema, LedgerWallet } from "@/types/wallets";

export const schema = z.object({
  name: z.string().min(1),
  paths: z.array(
    z.object({
      path: derivationPathSchema,
    }),
  ),
});

type Schema = z.infer<typeof schema>;

const defaultValues: Schema = {
  name: "",
  paths: [{ path: "m/44'/60'/0'/0/0" }],
};

export interface Props {
  wallet?: LedgerWallet;
  onSubmit: (data: object) => void;
  onRemove: () => void;
}

export function Ledger({ wallet, ...props }: Props) {
  if (!wallet) {
    return <Create {...props} />;
  } else {
    return <Update wallet={wallet} {...props} />;
  }
}

export function Create({ onSubmit, onRemove }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid, isDirty, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues,
  });

  const prepareAndSubmit = (data: Schema) => {
    onSubmit({
      ...data,
      type: "ledger",
      paths: data.paths.map(({ path }) => path),
    });
    reset(data);
  };

  const {
    fields: pathsFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "paths",
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
      {pathsFields.map((field, i) => (
        <Stack alignSelf="stretch" key={field.id} direction="row" spacing={2}>
          <TextField
            label={`Derivation Path #${i + 1}`}
            fullWidth
            error={!!errors.paths && !!errors.paths[i]}
            helperText={errors.paths && errors.paths[i]?.path?.message}
            {...register(`paths.${i}.path`)}
          />
          <Button onClick={() => remove(i)}>Remove</Button>
        </Stack>
      ))}
      <Button color="secondary" onClick={() => append({ path: "" })}>
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
function Update({}: Omit<Props, "type">) {
  return <>TODO</>;
}
