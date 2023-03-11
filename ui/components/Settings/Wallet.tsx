import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "flowbite-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { deriveAddresses, schema } from "@iron/state";
import { Address } from "@iron/state";

import { useDebouncedEffect } from "../../hooks/useDebouncedEffect";
import { useSettings } from "../../hooks/useSettings";
import { FieldRadio, FieldText } from "./Fields";

function deriveFiveAddresses(mnemonic: string, derivationPath: string) {
  return deriveAddresses(mnemonic, derivationPath, 0, 5).reduce(
    (acc: Record<number, Address>, address, i) => {
      acc[i] = address;
      return acc;
    },
    {}
  );
}

const formSchema = schema.shape.wallet.omit({ address: true });

export function WalletSettings() {
  const settings = useSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, errors },
    control,
    watch,
    trigger,
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });
  const onSubmit = (data: any) => {
    reset(data);
    settings.methods.setWalletSettings(data);
  };

  const [derivedAddresses, setDerivedAddresses] = useState<
    Record<number, Address>
  >({});

  // refresh listed addresses when mnemonic/path changes
  const [mnemonic, derivationPath] = watch(["mnemonic", "derivationPath"]);

  useDebouncedEffect(() => {
    console.log("useDebouncedEffect", isValid, mnemonic, derivationPath);
    if ((isDirty && !isValid) || !mnemonic || !derivationPath) return;
    try {
      const addresses = deriveFiveAddresses(mnemonic, derivationPath);
      setDerivedAddresses(addresses);
    } catch (err) {
      console.error(err);
    }
  }, [isValid, mnemonic, derivationPath, trigger]);

  // TODO:
  if (!settings.data) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldText
        name="Mnemonic"
        field="mnemonic"
        register={register}
        value={settings.data.wallet.mnemonic}
        error={errors.mnemonic}
      />
      <FieldText
        name="Derivation Path"
        field="derivationPath"
        register={register}
        value={settings.data.wallet.derivationPath}
        error={errors.derivationPath}
      />

      <FieldRadio
        control={control}
        name="addressIndex"
        title="Derivation Index"
        values={derivedAddresses}
        defaultValue={settings.data.wallet.addressIndex}
      />
      <div className="m-2">
        <Button type="submit" disabled={!isDirty || !isValid}>
          {isDirty ? "Save" : "Saved"}
        </Button>
      </div>
    </form>
  );
}
