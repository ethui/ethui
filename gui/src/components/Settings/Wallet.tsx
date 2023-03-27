import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "flowbite-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { useInvoke } from "../../hooks/tauri";
import { useDebouncedEffect } from "../../hooks/useDebouncedEffect";
import { Address, Wallet, walletSchema } from "../../types";
import { deriveFiveAddresses } from "../../utils/address";
import { FieldRadio, FieldText } from "./Fields";

export function WalletSettings() {
  const { data: wallet, mutate } = useInvoke<Wallet>("get_wallet");

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
    resolver: zodResolver(walletSchema),
  });

  const onSubmit = useCallback(
    async (data: any) => {
      reset(data);
      console.log(data);
      await invoke("set_wallet", {
        wallet: data,
      });
      mutate();
    },
    [reset, mutate]
  );

  const [derivedAddresses, setDerivedAddresses] = useState<
    Record<number, Address>
  >({});

  // refresh listed addresses when mnemonic/path changes
  const [mnemonic, derivationPath] = watch(["mnemonic", "derivation_path"]);

  useDebouncedEffect(() => {
    if ((isDirty && !isValid) || !mnemonic || !derivationPath) return;
    try {
      const addresses = deriveFiveAddresses(mnemonic, derivationPath);
      setDerivedAddresses(addresses);
    } catch (err) {
      console.error(err);
    }
  }, [isValid, mnemonic, derivationPath, trigger]);

  if (!wallet) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldText
        name="Mnemonic"
        field="mnemonic"
        register={register}
        value={wallet.mnemonic}
        error={errors.mnemonic}
      />
      <FieldText
        name="Derivation Path"
        field="derivation_path"
        register={register}
        value={wallet.derivation_path}
        error={errors.derivation_path}
      />

      <FieldRadio
        control={control}
        name="idx"
        title="Derivation Index"
        values={derivedAddresses}
        defaultValue={wallet.idx}
      />
      <div className="m-2">
        <Button type="submit" disabled={!isDirty || !isValid}>
          {isDirty ? "Save" : "Saved"}
        </Button>
      </div>
    </form>
  );
}
