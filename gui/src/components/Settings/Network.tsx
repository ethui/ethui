import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/tauri";
import { Button, Card } from "flowbite-react";
import { useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { useInvoke } from "../../hooks/tauri";
import { Network, networkSchema } from "../../types";
import { FieldText } from "./Fields";

const emptyNetwork: Network = {
  name: "",
  rpc_url: "",
  currency: "",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chain_id: undefined!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  decimals: undefined!,
};

export function NetworkSettings() {
  const { data: networks, mutate } = useInvoke<Network[]>("get_networks");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isDirty, isValid, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: { networks },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "networks",
  });

  const onSubmit = useCallback(
    async (data: { networks?: Network[] }) => {
      reset(data);
      await invoke("set_networks", { networks: data.networks });
      mutate();
    },
    [reset, mutate]
  );

  if (!networks) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {fields.map((field, index) => {
        const item = networks[index];
        const err = (errors.networks && errors.networks[index]) || {};
        return (
          <Card key={field.id}>
            <fieldset className="flex flex-col gap-4">
              <div className="flex gap-4">
                <FieldText
                  name="Name"
                  field={`networks.${index}.name`}
                  register={register}
                  value={item?.name}
                  error={err.name}
                />
                <FieldText
                  name="Chain Id"
                  field={`networks.${index}.chain_id`}
                  register={register}
                  value={item?.chain_id}
                  valueAsNumber={true}
                  error={err.chain_id}
                />
              </div>
              <FieldText
                name="RPC URL"
                field={`networks.${index}.rpc_url`}
                register={register}
                value={item?.rpc_url}
                error={err.rpc_url}
              />
              <div className="flex gap-4">
                <FieldText
                  name="Currency"
                  field={`networks.${index}.currency`}
                  register={register}
                  value={item?.currency}
                  error={err.currency}
                />
                <FieldText
                  name="Decimals"
                  field={`networks.${index}.decimals`}
                  register={register}
                  value={item?.decimals}
                  valueAsNumber={true}
                  error={err.decimals}
                />
              </div>
              <div>
                <Button color="warning" size="xs" onClick={() => remove(index)}>
                  Remove
                </Button>
              </div>
              <div className="divider divider-vertical" />
            </fieldset>
          </Card>
        );
      })}
      <div>
        <Button color="success" size="xs" onClick={() => append(emptyNetwork)}>
          Add
        </Button>
      </div>
      <div className="my-2">
        <Button type="submit" disabled={!isDirty || !isValid}>
          {isDirty ? "Save" : "Saved"}
        </Button>
      </div>
    </form>
  );
}
