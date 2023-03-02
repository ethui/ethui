import React from "react";
import { schemas, useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormControl } from "./utils";

export function NetworkSettings() {
  const [rpc, setRpc] = useStore((state) => [state.rpc, state.setRpc]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, errors },
  } = useForm({ resolver: zodResolver(schemas.network) });
  const onSubmit = (data: any) => {
    reset(data);
    setRpc(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl
        name="RPC"
        register={register("rpc")}
        value={rpc}
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
