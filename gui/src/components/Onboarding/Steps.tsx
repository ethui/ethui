import {
  Alert,
  Box,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";

import { useInvoke } from "@/hooks";
import { Peer } from "@/types";

import { type WizardFormData } from "./";

export type Step = {
  title: string;
  component: ({
    formData,
    setFormData,
    setStepCompleted,
  }: {
    formData: WizardFormData;
    setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
    setStepCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  }) => JSX.Element;
};

export const steps = [
  {
    title: "Welcome",
    component: WelcomeStep,
  },
  {
    title: "Live blockchains",
    component: LiveBlockchainsStep,
  },
  {
    title: "Install extension",
    component: InstallExtensionStep,
  },
  {
    title: "Thank you!",
    component: ThankYouStep,
  },
];

function WelcomeStep() {
  return (
    <Typography component="p">
      Iron is an Ethereum wallet for developers. Check out{" "}
      <Link
        underline="hover"
        href="https://mirror.xyz/iron-wallet.eth"
        target="_blank"
        rel="nofollow noopener noreferrer"
      >
        our website
      </Link>{" "}
      to learn more, or check out the&nbsp;
      <Link
        underline="hover"
        href="https://mirror.xyz/iron-wallet.eth"
        target="_blank"
        rel="nofollow noopener noreferrer"
      >
        source code on Github
      </Link>{" "}
      Contributors are welcome!
    </Typography>
  );
}

function LiveBlockchainsStep({
  formData,
  setFormData,
}: {
  formData: WizardFormData;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
}) {
  const onChange = (ev: ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((data) => ({ ...data, alchemyApiKey: ev.target.value }));
  };

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
        out of the box. But for live blockchains, a connection to{" "}
        <Link
          underline="hover"
          href="https://www.alchemy.com/"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          alchemy.com
        </Link>{" "}
        is recommended. Insert your personal API below.
      </Typography>
      <TextField
        label="API Key"
        fullWidth
        type="text"
        variant="outlined"
        onChange={onChange}
        value={formData.alchemyApiKey}
      />
    </Stack>
  );
}

interface InstallExtensionStepProps {
  setStepCompleted: React.Dispatch<React.SetStateAction<boolean>>;
}

function InstallExtensionStep({ setStepCompleted }: InstallExtensionStepProps) {
  const [loading, setLoading] = useState<boolean>(true);

  const { data: peers } = useInvoke<Peer[]>("ws_all_peers");

  useEffect(() => {
    const peerDetected = peers?.length != 0;
    setLoading(!peerDetected);
    setStepCompleted(peerDetected);
  }, [peers, setStepCompleted]);

  return (
    <Stack spacing={2} alignItems={"center"}>
      <Typography width={"100%"} component="p">
        Iron requires its browser extension to be installed:
      </Typography>
      <Box component="ol">
        <Typography component="li">
          Ensure the{" "}
          <Link
            underline="hover"
            href="https://chrome.google.com/webstore/detail/iron-wallet/eljobehkpcnpekmbcjiidekjhkbcnpkf"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            extension
          </Link>{" "}
          is installed;
        </Typography>
        <Typography component="li">
          Go to a website (such as{" "}
          <Link
            underline="hover"
            href="https://app.uniswap.org/"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            Uniswap
          </Link>
          ) and connect.
        </Typography>
      </Box>
      {loading ? (
        <CircularProgress size={30} />
      ) : (
        <Alert severity="success">Extension detected!</Alert>
      )}
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
