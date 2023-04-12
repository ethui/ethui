import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { useInvoke } from "../../hooks/tauri";
import { Network, networkSchema } from "../../types";
import Button from "../Base/Button";
import { Card } from "../Base/Card";
import { FieldCheckbox, FieldText } from "./Fields";

const emptyNetwork: Network = {
  name: "",
  dev: false,
  http_url: "",
  ws_url: "",
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
    formState: { isValid, dirtyFields, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: { networks },
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;
  console.log(errors);
  console.log("isValid", isValid);

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
                <FieldCheckbox
                  name="Dev mode"
                  field={`networks.${index}.dev`}
                  register={register}
                />
              </div>
              <FieldText
                name="HTTP RPC"
                field={`networks.${index}.http_url`}
                register={register}
                value={item?.http_url}
                error={err.http_url}
              />
              <FieldText
                name="WebSockets URL"
                field={`networks.${index}.ws_url`}
                register={register}
                value={item?.ws_url}
                error={err.ws_url}
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
        <Button type="submit" disabled={!isDirtyAlt || !isValid}>
          {isDirtyAlt ? "Save" : "Saved"}
        </Button>
      </div>
    </form>
  );
}
