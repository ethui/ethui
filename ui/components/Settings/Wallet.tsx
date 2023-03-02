import React from "react";
import { schemas, useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldRadio, FieldText } from "./Fields";

export function WalletSettings() {
  const [walletSettings, setWalletSettings] = useStore((state) => [
    state.wallet,
    state.setWalletSettings,
  ]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, errors },
    control,
  } = useForm({ resolver: zodResolver(schemas.wallet) });
  const onSubmit = (data: any) => {
    reset(data);
    setWalletSettings(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldText
        name="Mnemonic"
        register={register("mnemonic")}
        value={walletSettings.mnemonic}
        error={errors.mnemonic}
      />
      <FieldText
        name="Derivation Path"
        register={register("derivationPath")}
        value={walletSettings.derivationPath}
        error={errors.derivationPath}
      />
      <FieldRadio
        control={control}
        name="addressIndex"
        title="Derivation Index"
        values={[0, 1, 2, 3, 4]}
        defaultValue={walletSettings.addressIndex}
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
