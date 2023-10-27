import {
  Alert,
  Collapse,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { ChangeEvent, useState } from "react";
import { FieldValues } from "react-hook-form";

import { HDWalletForm } from "@/components/Settings/Wallet/HDWallet";

import { type WizardFormData } from "./";

export type Step = {
  title: string;
  component: ({
    formData,
    setFormData,
  }: {
    formData: WizardFormData;
    setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
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
    title: "Add HD wallet",
    component: AddHDWalletStep,
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

function AddHDWalletStep() {
  const [success, setSuccess] = useState<boolean>(false);

  const onSubmit = (params: FieldValues) => {
    invoke("wallets_create", { params });
    setSuccess(true);
  };

  return (
    <>
      <HDWalletForm
        type={"create"}
        wallet={{
          type: "HDWallet",
          name: "",
          count: 5,
          derivationPath: "",
          mnemonic: "",
          password: "",
        }}
        onSubmit={onSubmit}
        onCancel={() => {}}
        onRemove={() => {}}
      />
      <Collapse in={success}>
        <Alert> Wallet added successfully! </Alert>
      </Collapse>
    </>
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
