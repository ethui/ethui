import React from "react";
import { useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormControl } from "./utils";

const schema = z.object({
  mnemonic: z.string().regex(/^(\w+\s){11}\w+$/),
});

export function WalletSettings() {
  const [mnemonic, setMnemonic] = useStore((state) => [
    state.mnemonic,
    state.setMnemonic,
  ]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, errors },
  } = useForm({ resolver: zodResolver(schema) });
  const onSubmit = (data: any) => {
    reset(data);
    setMnemonic(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl
        name="Mnemonic"
        register={register("mnemonic")}
        value={mnemonic}
        error={errors.mnemonic}
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
