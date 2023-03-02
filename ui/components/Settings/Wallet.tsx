import React from "react";
import { schemas, useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormControl } from "./utils";

export function WalletSettings() {
  const [mnemonic, derivationPath, addressIndex, setWalletSettings] = useStore(
    (state) => [
      state.mnemonic,
      state.derivationPath,
      state.addressIndex,
      state.setWalletSettings,
    ]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, errors },
  } = useForm({ resolver: zodResolver(schemas.wallet) });
  const onSubmit = (data: any) => {
    reset(data);
    setWalletSettings(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl
        name="Mnemonic"
        register={register("mnemonic")}
        value={mnemonic}
        error={errors.mnemonic}
      />
      <FormControl
        name="Derivation Path"
        register={register("derivationPath")}
        value={derivationPath}
        error={errors.derivationPath}
      />
      <FormControl
        name="Address Index"
        register={register("addressIndex", { valueAsNumber: true })}
        value={addressIndex.toString()}
        error={errors.addressIndex}
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
