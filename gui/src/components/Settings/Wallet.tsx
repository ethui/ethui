import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import truncateEthAddress from "truncate-eth-address";

import { useInvoke } from "../../hooks/tauri";
import { Address, Wallet, walletSchema } from "../../types";
import Button from "../Base/Button";
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
  console.log(watch[("mnemonic", "derivationPath", "idx")]);

  // addresses are derived on the fly by backend
  useEffect(() => {
    const localMnemonic: string = mnemonic ?? wallet?.mnemonic;
    const localPath: string = derivationPath ?? wallet?.derivationPath;

    if ((isDirtyAlt && !isValid) || !localMnemonic || !localPath) return;
    (async () => {
      try {
        const addresses = (await invoke("derive_addresses_with_mnemonic", {
          mnemonic: localMnemonic,
          derivationPath: localPath,
        })) as Address[];

        console.log(addresses);
        const addressMap = addresses.reduce((acc, address, i) => {
          acc[i] = address;
          return acc;
        }, {} as Record<number, Address>); // as Record<number, Address>;

        setDerivedAddresses(addressMap);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [wallet, isDirtyAlt, isValid, mnemonic, derivationPath, trigger]);

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
        title="Address"
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
