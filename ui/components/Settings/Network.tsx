import { useContext } from "react";
import { schemas, useStore } from "@iron/state";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldText } from "./Fields";
import { ExtensionContext } from "../../context";

const emptyNetwork = {
  name: "",
  url: "",
  currency: "",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chainId: undefined!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  decimals: undefined!,
};

export function NetworkSettings() {
  const { stream } = useContext(ExtensionContext);
  const [networkSettings, setNetworks] = useStore((state) => [
    state.network,
    state.setNetworks,
  ]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isDirty, isValid, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(schemas.network),
    defaultValues: networkSettings,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "networks",
  });

  const onSubmit = (data: any) => {
    reset(data);
    setNetworks(data.networks, stream);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => {
        const item = networkSettings.networks[index];
        const err = (errors.networks && errors.networks[index]) || {};
        return (
          <fieldset key={field.id}>
            <div className="flex">
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
            <div className="flex">
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
            <button
              className="btn btn-sm btn-warning mt-2"
              onClick={() => remove(index)}
            >
              Remove
            </button>
            <div className="divider divider-vertical" />
          </fieldset>
        );
      })}
      <button
        className="btn btn-sm btn-accent"
        onClick={() => append(emptyNetwork)}
      >
        Add
      </button>
      <div className="my-2">
        <input
          type="submit"
          value={isDirty ? "Save" : "Saved"}
          disabled={!isDirty || !isValid}
          className="p-2 btn btn-primary"
        />
      </div>
    </form>
  );
}
