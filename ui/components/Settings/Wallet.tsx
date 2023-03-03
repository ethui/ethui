import React, { useCallback, useEffect, useState } from "react";
import { deriveAddresses, schemas, useStore } from "@iron/state";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldRadio, FieldText } from "./Fields";
import { Address } from "@iron/state";
import { ErrorMessage } from "@hookform/error-message";
import { debounce } from "lodash";

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
  } = useForm({ resolver: zodResolver(schemas.wallet) });
  const onSubmit = (data: any) => {
    reset(data);
    setWalletSettings(data);
  };

  const [derivedAddresses, setDerivedAddresses] = useState<
    Record<number, Address>
  >({});

  const [mnemonic, derivationPath] = watch(["mnemonic", "derivationPath"]);
  console.log(derivedAddresses);

  const debouncedDeriveAddresses = useCallback(
    debounce((mnemonic: string, derivationPath: string) => {
      deriveAddresses(mnemonic, derivationPath, 0, 5).reduce(
        (acc, address, i) => {
          acc[i] = address;
          return acc;
        },
        {}
      );
    }, 200),
    []
  );

  useEffect(() => {
    try {
      const addresses = debouncedDeriveAddresses(mnemonic, derivationPath);
      setDerivedAddresses(addresses);
    } catch (err) {
      console.error(err);
    }
  }, [mnemonic, derivationPath]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldText
        name="Mnemonic"
        register={register("mnemonic")}
        value={walletSettings.mnemonic}
        error={errors.mnemonic}
      />
      <ErrorMessage name="mnemonic" {...{ errors }} />
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
