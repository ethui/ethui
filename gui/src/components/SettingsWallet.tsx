import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { map } from "lodash";
import React from "react";
import { useCallback, useEffect, useState } from "react";
import { Controller, FieldValues, useForm } from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { Address, Wallet, walletSchema } from "../types";

export function SettingsWallet() {
  const { data: wallet, mutate } = useInvoke<Wallet>("get_wallet");

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, dirtyFields, errors },
    control,
    watch,
    trigger,
    clearErrors,
    setError,
  } = useForm({
    mode: "onChange",
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

        const addressMap = addresses.reduce((acc, address, i) => {
          acc[i] = address;
          return acc;
        }, {} as Record<number, Address>); // as Record<number, Address>;

        setDerivedAddresses(addressMap);
        clearErrors(["mnemonic", "derivationPath"]);
      } catch (err) {
        const message = `${err}`.replace("WalletError: ", "");

        if (`${err}`.match(/word/)) {
          setError("mnemonic", { type: "custom", message });
        } else {
          setError("derivationPath", { type: "custom", message });
        }
      }
    })();
  }, [
    wallet,
    isDirtyAlt,
    isValid,
    mnemonic,
    derivationPath,
    trigger,
    clearErrors,
    setError,
  ]);

  if (!wallet) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Stack alignItems="flex-start" spacing={2}>
        <TextField
          label="Mnemonic"
          defaultValue={wallet.mnemonic}
          error={!!errors.mnemonic}
          helperText={errors.mnemonic?.message?.toString() || ""}
          fullWidth
          {...register("mnemonic")}
        />
        <TextField
          label="Derivation Path"
          spellCheck="false"
          defaultValue={wallet.derivationPath}
          error={!!errors.derivationPath}
          helperText={errors.derivationPath?.message?.toString() || ""}
          {...register("derivationPath")}
        />
        <FormControl error={!!errors.idx}>
          <FormLabel id="account">Account</FormLabel>
          <Controller
            rules={{ required: true }}
            control={control}
            name="idx"
            render={({ field }) => (
              <RadioGroup
                aria-labelledby="account"
                {...field}
                value={field.value === undefined ? wallet.idx : field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              >
                {map(derivedAddresses, (address: Address, id: string) => (
                  <FormControlLabel
                    key={id}
                    value={parseInt(id, 10)}
                    control={<Radio />}
                    label={address}
                  />
                ))}
              </RadioGroup>
            )}
          />
          {errors.idx && (
            <FormHelperText>{errors.idx.message?.toString()}</FormHelperText>
          )}
        </FormControl>
        <Button
          variant="contained"
          type="submit"
          disabled={!isDirtyAlt || !isValid}
        >
          Save
        </Button>
      </Stack>
    </form>
  );
}
