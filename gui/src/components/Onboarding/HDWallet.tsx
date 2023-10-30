import { Alert, Box, Button, Collapse, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { useState } from "react";
import { FieldValues } from "react-hook-form";

import { HDWalletForm } from "@/components/Settings/Wallet/HDWallet";

import { StepProps } from ".";

export function HDWalletStep({ onSubmit }: StepProps) {
  const [submitted, setSubmitted] = useState<boolean>(false);

  const localOnSubmit = (params: FieldValues) => {
    invoke("wallets_create", { params });
    setSubmitted(true);
  };

  return (
    <Stack width="100%" spacing={2} alignItems="center">
      <Typography variant="h6" component="h1" alignSelf="start">
        Add an HD Wallet
      </Typography>
      <Box sx={{ alignSelf: "stretch" }}>
        <HDWalletForm
          type="create"
          wallet={{
            type: "HDWallet",
            name: "",
            count: 5,
            derivationPath: "",
            mnemonic: "",
            password: "",
          }}
          onSubmit={localOnSubmit}
          onCancel={() => {}}
          onRemove={() => {}}
        />
      </Box>
      <Collapse in={submitted}>
        <Alert>Wallet added successfully!</Alert>
      </Collapse>
      <Button variant="contained" onClick={onSubmit} sx={{ alignSelf: "end" }}>
        {submitted ? "Next" : "Skip"}
      </Button>
    </Stack>
  );
}
