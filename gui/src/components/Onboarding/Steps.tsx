import {
  Alert,
  Box,
  Checkbox,
  Collapse,
  FormControlLabel,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { ChangeEvent, useState } from "react";
import { type FieldValues } from "react-hook-form"; // TODO: check this import

import { HDWalletForm } from "@/components/Settings/Wallet/HDWallet";
import { mnemonicSchema } from "@/types";

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
  const [validationError, setValidationError] = useState("");

  const onMnemonicChange = async (ev: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = ev.target;
    const validation = await mnemonicSchema.safeParseAsync(value);

    if (validation.success) {
      setFormData((data) => ({ ...data, testMnemonic: value }));
      setValidationError("");
    } else {
      setValidationError(validation.error.errors[0].message);
    }
  };

  const onOptInChange = (ev: ChangeEvent<HTMLInputElement>) => {
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
      <Grid container>
        <Grid item xs>
          <TextField
            fullWidth
            label="Test wallet mnemonic"
            type="text"
            variant="outlined"
            onChange={onMnemonicChange}
            defaultValue={formData.testMnemonic}
            error={!!validationError}
            helperText={validationError}
          />
        </Grid>
        <Grid item>
          <FormControlLabel
            label="Opt-in"
            labelPlacement="top"
            control={
              <Checkbox
                size={"small"}
                checked={formData.createTestWallet}
                onChange={onOptInChange}
              />
            }
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

function AddHDWalletStep({
  formData,
  setFormData,
}: {
  formData: WizardFormData;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
}) {
  const [success, setSuccess] = useState(false);

  const onSubmit = (params: FieldValues) => {
    // TODO: remove this clause
    if (!formData.addedHDWallet) {
      invoke("wallets_create", { params });
      setFormData((data) => ({ ...data, addedHDWallet: true }));
      setSuccess(true);
    }
  };

  return (
    // TODO: check a shorter way to pass the wallet prop
    // TODO: what to do with the onCancel button
    <Box mb={2.5}>
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
        <Alert>Wallet added successfully!</Alert>
      </Collapse>
    </Box>
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
