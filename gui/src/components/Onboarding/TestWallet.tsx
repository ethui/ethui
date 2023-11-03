import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Link, Stack, TextField, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { mnemonicSchema } from "@/types";

import { StepProps } from ".";

export function TestWalletStep({ onSubmit }: StepProps) {
  const {
    handleSubmit,
    register,
    formState: { isValid, errors, isSubmitted },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(z.object({ mnemonic: mnemonicSchema })),
    defaultValues: {
      mnemonic: "test test test test test test test test test test test junk",
    },
  });

  const localOnSubmit = async (data: FieldValues) => {
    await invoke("wallets_create", {
      params: {
        type: "plaintext",
        name: "Test wallet",
        mnemonic: data.mnemonic,
        derivationPath: "m/44'/60'/0'/0",
        count: 3,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(localOnSubmit)}>
      <Stack spacing={3} pb={2.5}>
        <Typography variant="h6" component="h1" alignSelf="start">
          Create test wallet
        </Typography>
        <Typography component="p">
          Iron is prepared to connect to{" "}
          <Link
            underline="hover"
            href="https://book.getfoundry.sh/anvil/"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            Anvil
          </Link>{" "}
          nodes, using its default mnemonic (unsafe). You can opt-out of this
          behaviour if you don&apos;t plan to use it.
        </Typography>
        <TextField
          label="Test wallet mnemonic"
          fullWidth
          multiline
          error={!!errors.mnemonic}
          helperText={errors.mnemonic?.message?.toString()}
          disabled={isSubmitted}
          {...register("mnemonic")}
        />
        <Stack spacing={1} direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            disabled={!isValid || isSubmitted}
            type="submit"
          >
            {isSubmitted ? "Wallet created" : "Create wallet"}
          </Button>
          <Button variant="contained" onClick={onSubmit}>
            {isSubmitted ? "Next" : "Skip"}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
