import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { createElement, useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import truncateEthAddress from "truncate-eth-address";
import { formatUnits } from "viem";
import { z } from "zod";

import { useDialog } from "../hooks/useDialog";
import { useProvider } from "../hooks/useProvider";
import { Address, derivationPathSchema, mnemonicSchema } from "../types";

export interface Request {
  wallet_type: "plaintext" | "jsonkeystore";
}

const steps = ["Import", "Secure", "Review"];

const types = {
  plaintext: Plaintext,
  jsonkeystore: JsonKeystore,
};

// TODO: only one type supported for now (HDWallet)
export function WalletCreateDialog({ id }: { id: number }) {
  const { data, accept } = useDialog<Request>(id);

  if (!data) return null;

  const component = types[data.wallet_type];

  return (
    <Stack direction="column" spacing={2} sx={{ p: 2 }}>
      {createElement(component, data)}
    </Stack>
  );
}
