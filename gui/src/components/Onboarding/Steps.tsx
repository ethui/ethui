import {
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent } from "react";

import { type WizardFormData } from "./";
import { HDWalletForm } from "../Settings/Wallet/HDWallet";

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
    title: "Create test wallet",
    component: CreateTestWalletStep,
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

function CreateTestWalletStep({
  formData,
  setFormData,
}: {
  formData: WizardFormData;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
}) {
  const onChange = (ev: ChangeEvent<HTMLInputElement>) => {
    setFormData((data) => ({ ...data, createTestWallet: ev.target.checked }));
  };

  return (
    <Stack spacing={3}>
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
      <FormControlLabel
        label="Opt-in"
        labelPlacement="top"
        control={
          <Checkbox checked={formData.createTestWallet} onChange={onChange} />
        }
      />
    </Stack>
  );
}

function AddHDWalletStep() {
  return (
    // TODO: check a shorter way to pass the wallet prop
    // TODO: implement callbacks
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
      onSubmit={() => {
        throw new Error("Function submit not implemented.");
      }}
      onCancel={() => {
        throw new Error("Function cancel not implemented.");
      }}
      onRemove={() => {
        throw new Error("Function remove not implemented.");
      }}
    />
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
