import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card } from "flowbite-react";
import { useFieldArray, useForm } from "react-hook-form";

import { schema } from "@iron/state";

import { useSettings } from "../../hooks/useSettings";
import { FieldText } from "./Fields";

const emptyNetwork = {
  name: "",
  url: "",
  currency: "",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chainId: undefined!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  decimals: undefined!,
};

const formSchema = schema.shape.network;

export function NetworkSettings() {
  const settings = useSettings();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isDirty, isValid, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
    defaultValues: settings.data?.network,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "networks",
  });

  const onSubmit = (data: any) => {
    reset(data);
    settings.methods.setNetworks(data.networks);
  };

  if (!settings.data) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {fields.map((field, index) => {
        const item = settings.data.network.networks[index];
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
                  field={`networks.${index}.chainId`}
                  register={register}
                  value={item?.chainId}
                  valueAsNumber={true}
                  error={err.chainId}
                />
              </div>
              <FieldText
                name="URL"
                field={`networks.${index}.url`}
                register={register}
                value={item?.url}
                error={err.url}
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
