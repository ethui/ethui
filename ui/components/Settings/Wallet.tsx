import React, { useEffect, useState } from "react";
import { deriveAddresses, schemas, useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldRadio, FieldText } from "./Fields";
import { Address } from "@iron/state/src/types";

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
    getValues,
  } = useForm({ resolver: zodResolver(schemas.wallet) });
  const onSubmit = (data: any) => {
    reset(data);
    setWalletSettings(data);
  };

  const [derivedAddresses, setDerivedAddresses] = useState<
    Record<number, Address>
  >({});

  useEffect(() => {
    const addresses = deriveAddresses(
      walletSettings.mnemonic,
      walletSettings.derivationPath,
      0,
      5
    ).reduce((acc, address, i) => {
      acc[i] = address;
      return acc;
    }, {});

    setDerivedAddresses(addresses);
  }, []);

  console.log(getValues());

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
        values={derivedAddresses}
        defaultValue={walletSettings.addressIndex}
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
