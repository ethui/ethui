import { Link, Stack, TextField, Typography } from "@mui/material";
import { ReactNode } from "react";

import { useWizardForm } from "../../store/wizard";

export type Step = { title: string; component: ReactNode };

export const steps = [
  {
    title: "Welcome",
    component: <WelcomeStep />,
  },
  {
    title: "Live blockchains",
    component: <LiveBlockchainsStep />,
  },
  {
    title: "Thank you!",
    component: <ThankYouStep />,
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
  const { alchemyApiKey, setAlchemyApiKey } = useWizardForm();

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
      <TextField
        label="API Key"
        fullWidth
        type="text"
        variant="outlined"
        onChange={(e) => setAlchemyApiKey(e.target.value)}
        value={alchemyApiKey.value}
      />
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
