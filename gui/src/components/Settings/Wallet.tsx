import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/tauri";
import { Button } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";

import { useInvoke } from "../../hooks/tauri";
import { Address, Wallet, walletSchema } from "../../types";
import { FieldRadio, FieldText } from "./Fields";

export function WalletSettings() {
  const { data: wallet, mutate } = useInvoke<Wallet>("get_wallet");

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, dirtyFields, errors },
    control,
    watch,
    trigger,
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(walletSchema),
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

  const onSubmit = useCallback(
    async (data: FieldValues) => {
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
  const [mnemonic, derivationPath] = watch(["mnemonic", "derivationPath"]);

  // addresses are derived on the fly by backend
  useEffect(() => {
    if ((isDirtyAlt && !isValid) || !mnemonic || !derivationPath) return;
    (async () => {
      try {
        const addresses = (await invoke("derive_addresses_with_mnemonic", {
          mnemonic,
          derivationPath,
        })) as Record<number, Address>;
        setDerivedAddresses(addresses);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [isDirtyAlt, isValid, mnemonic, derivationPath, trigger]);

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
        field="derivationPath"
        register={register}
        value={wallet.derivationPath}
        error={errors.derivationPath}
      />

      <FieldRadio
        control={control}
        name="idx"
        title="Derivation Index"
        values={derivedAddresses}
        defaultValue={wallet.idx}
      />
      <div className="m-2">
        <Button type="submit" disabled={!isDirtyAlt || !isValid}>
          {isDirtyAlt ? "Save" : "Saved"}
        </Button>
      </div>
    </form>
  );
}
