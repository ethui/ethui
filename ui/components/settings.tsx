import React from "react";
import { useStore } from "../store";
import { FieldError, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  mnemonic: z.string().regex(/^(\w+\s){11}\w+$/),
  rpc: z.string().regex(/^(https?):\/\/[^\s/$.?#].[^\s]*$/),
});

export function Settings() {
  const [mnemonic, rpc, setSettings] = useStore((state) => [
    state.mnemonic,
    state.rpc,
    state.setSettings,
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const onSubmit = (data: any) => setSettings(data);

  return (
    <>
      <h2 className="text-xl">Settings</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl
          name="Mnemonic"
          register={register("mnemonic")}
          value={mnemonic}
          error={errors.mnemonic}
        />
        <FormControl
          name="RPC"
          register={register("rpc")}
          value={rpc}
          error={errors.rpc}
        />
        <div className="m-2">
          <input type="submit" value="Save" className="p-2 btn btn-primary" />
        </div>
      </form>
    </>
  );
}

interface FormControlProps {
  name: string;
  register: any;
  value: string;
  error: FieldError | undefined;
}

function FormControl({ name, register, value, error }: FormControlProps) {
  return (
    <div className="form-control w-full max-w-xs m-2">
      <label className="label">
        <span className="label-text">{name}</span>
      </label>
      <input
        type="text"
        {...register}
        defaultValue={value}
        className="input input-bordered w-full max-w-xs"
      />
      {error && <p>&#9888; {error.message} </p>}
    </div>
  );
}
