import React, { useEffect, useState } from "react";
import { deriveAddresses, schemas, useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldRadio, FieldText } from "./Fields";
import { Address } from "@iron/state";
import { useDebouncedEffect } from "../../hooks/useDebouncedEffect";

function deriveFiveAddresses(mnemonic: string, derivationPath: string) {
  return deriveAddresses(mnemonic, derivationPath, 0, 5).reduce(
    (acc, address, i) => {
      acc[i] = address;
      return acc;
    },
    {}
  );
}

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
    watch,
    trigger,
  } = useForm({ mode: "onBlur", resolver: zodResolver(schemas.wallet) });
  const onSubmit = (data: any) => {
    reset(data);
    setWalletSettings(data);
  };

  const [derivedAddresses, setDerivedAddresses] = useState<
    Record<number, Address>
  >({});

  // refresh listed addresses when mnemonic/path changes
  const [mnemonic, derivationPath] = watch(["mnemonic", "derivationPath"]);
  useDebouncedEffect(() => {
    if (!isValid || !mnemonic || !derivationPath) return;
    try {
      const addresses = deriveFiveAddresses(mnemonic, derivationPath);
      setDerivedAddresses(addresses);
    } catch (err) {
      console.error(err);
    }
  }, [isValid, mnemonic, derivationPath, trigger]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldText
        name="Mnemonic"
        field="mnemonic"
        register={register}
        value={walletSettings.mnemonic}
        error={errors.mnemonic}
      />
      <FieldText
        name="Derivation Path"
        field="derivationPath"
        register={register}
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
