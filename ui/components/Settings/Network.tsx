import React from "react";
import { schemas, useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldText } from "./Fields";

export function NetworkSettings() {
  const [networkSettings, setNetworkSettings] = useStore((state) => [
    state.network,
    state.setNetworkSettings,
  ]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, errors },
  } = useForm({ resolver: zodResolver(schemas.network) });
  const onSubmit = (data: any) => {
    reset(data);
    setNetworkSettings(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldText
        name="RPC"
        field="rpc"
        register={register}
        value={networkSettings.rpc}
        error={errors.rpc}
      />
      <div className="m-2">
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
