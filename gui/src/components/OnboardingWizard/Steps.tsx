import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Link, Stack, TextField, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { ReactNode, useCallback } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { useInvoke } from "../../hooks";
import { GeneralSettings } from "../../types";

export type Step = { label: string; description: ReactNode };

export const steps = [
  {
    label: "Welcome",
    description: <WelcomeStep />,
  },
  {
    label: "Live blockchains",
    description: <LiveBlockchainsStep />,
  },
  {
    label: "Thank you!",
    description: <ThankYouStep />,
  },
];

function WelcomeStep() {
  return (
    <Typography component="p">
      Iron is a crypto wallet built with development and debugging in mind. It
      bundles together features that exist only as loose CLI tools and 3rd party
      websites. It runs locally on your device and is{" "}
      <Link
        underline="hover"
        href="https://github.com/iron-wallet/iron"
        target="_blank"
        rel="nofollow noopener noreferrer"
      >
        100% open-source
      </Link>
      .
    </Typography>
  );
}

function LiveBlockchainsStep() {
  const { mutate } = useInvoke<GeneralSettings>("settings_get");

  const schema = z.object({
    alchemyApiKey: z.string(),
  });

  const {
    handleSubmit,
    register,
    formState: { errors, isValid },
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const onSubmit = useCallback(
    async (data: FieldValues) => {
      await invoke("settings_set", {
        newSettings: data,
      });
      mutate();
    },
    [mutate]
  );

  return (
    <Stack spacing={3}>
      <Typography component="p">
        Iron works with{" "}
        <Link
          underline="hover"
          href="https://book.getfoundry.sh/anvil/"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          Anvil
        </Link>{" "}
        out of the box. If you want to use Iron with a live blockchain, create
        an account on{" "}
        <Link
          underline="hover"
          href="https://www.alchemy.com/"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          Alchemy
        </Link>{" "}
        and set up the API key.
      </Typography>
      <Stack
        component="form"
        direction="row"
        spacing={1}
        onSubmit={handleSubmit(onSubmit)}
      >
        <TextField
          label="API Key"
          variant="outlined"
          fullWidth
          error={!!errors.alchemyApiKey}
          helperText={errors.alchemyApiKey?.message?.toString() || ""}
          {...register("alchemyApiKey")}
        />
        <Button
          variant="contained"
          type="submit"
          disabled={!isValid}
          sx={{ height: "56px" }}
        >
          Save
        </Button>
      </Stack>
    </Stack>
  );
}

function ThankYouStep() {
  return (
    <Typography component="p">
      Thank you for using Iron. If you find any problems, please open an issue
      on GitHub.
    </Typography>
  );
}
